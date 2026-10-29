import {managementUser,managementLogin,managementLogout} from '@/app/management';
import {initial} from '@/db/default-quiz';
import {gameDb} from '@/db/game';
// Derived, short-lived read cache only; D1 remains authoritative for all mutations.
const readCache = new Map<string,{expires:number,value:Promise<any>}>();
function sharedRead(key:string,ttl:number,read:()=>Promise<any>){
 const entry=readCache.get(key);if(entry && entry.expires>Date.now())return entry.value;
 if(readCache.size>=256)readCache.delete(readCache.keys().next().value!);
 const value=read().catch(e=>{readCache.delete(key);throw e;});
 readCache.set(key,{expires:Date.now()+ttl,value});return value;
}
const fail=(error:string,status=400)=>Response.json({error},{status});
export async function POST(req:Request){
try{
if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return fail('Origem inválida.',403);
const raw=await req.text();if(raw.length>60000)return fail('Quiz muito grande.');let b:any;try{b=JSON.parse(raw)}catch{return fail('Pedido inválido.')}
if(!b||typeof b!=='object')return fail('Pedido inválido.');
if(b.action==='management_login')return managementLogin(req,b.password);
if(b.action==='management_logout')return managementLogout();
const db=gameDb(),now=Date.now();
if(['management','load_draft','save_draft','create'].includes(b.action)||b.action==='advance'||(b.action==='state'&&typeof b.hostToken==='string')){
 const auth=await managementUser(req);
 if(b.action==='management')return Response.json({canManage:auth.allowed},{headers:{'Cache-Control':'no-store'}});
 if(!auth.allowed)return fail('Digite a senha da gestão da SEMEST para continuar.',403);
}
if(b.action==='load_draft'){
 const draft:any=await db.prepare("SELECT * FROM quiz_drafts WHERE id='semest'").first();
 return Response.json(draft?{title:draft.title,questions:JSON.parse(draft.questions),revision:draft.revision,updated:draft.updated}:{title:'Desafio de estatística',questions:initial,revision:0,updated:null},{headers:{'Cache-Control':'no-store'}});
}
if(b.action==='save_draft'){
 if(typeof b.title!=='string'||b.title.length>100||!Array.isArray(b.questions)||b.questions.length>50||!Number.isInteger(b.revision)||b.revision<0)return fail('Rascunho inválido.');
 for(const q of b.questions)if(!q||typeof q.text!=='string'||q.text.length>400||!Array.isArray(q.options)||q.options.length!==4||q.options.some((o:any)=>typeof o!=='string'||o.length>150)||!Number.isInteger(q.correct)||q.correct<0||q.correct>3||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>120)return fail('Confira as alternativas e os tempos (5 a 120 segundos).');
 const saved=b.revision===0?await db.prepare("INSERT OR IGNORE INTO quiz_drafts(id,title,questions,revision,updated) VALUES('semest',?,?,1,?) RETURNING revision,updated").bind(b.title,JSON.stringify(b.questions),now).first():await db.prepare("UPDATE quiz_drafts SET title=?,questions=?,revision=revision+1,updated=? WHERE id='semest' AND revision=? RETURNING revision,updated").bind(b.title,JSON.stringify(b.questions),now,b.revision).first();
 if(!saved)return fail('As perguntas foram salvas em outra aba. Suas edições foram mantidas aqui; copie-as antes de recarregar o editor.',409);
 return Response.json(saved);
}
if(b.action==='create'){
 const draft:any=await db.prepare("SELECT * FROM quiz_drafts WHERE id='semest'").first();
 if(!draft||draft.revision!==b.revision)return fail('Salve as perguntas e atualize o editor antes de criar uma sala.',409);
 b.title=draft.title;b.questions=JSON.parse(draft.questions);
if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100||!Array.isArray(b.questions)||b.questions.length<1||b.questions.length>50)return fail('Preencha o nome e inclua entre 1 e 50 perguntas.');
for(const q of b.questions)if(typeof q.text!=='string'||!q.text.trim()||q.text.length>400||!Array.isArray(q.options)||q.options.length!==4||q.options.some((o:any)=>typeof o!=='string'||!o.trim()||o.length>150)||!Number.isInteger(q.correct)||q.correct<0||q.correct>3||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>120)return fail('Preencha todas as alternativas, marque a correta e escolha um tempo entre 5 e 120 segundos.');
const pin=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000),hostToken=crypto.randomUUID();
const result=await db.prepare('INSERT OR IGNORE INTO rooms(pin,host_token,title,questions,created) VALUES(?,?,?,?,?)').bind(pin,hostToken,b.title.trim(),JSON.stringify(b.questions),now).run();
if(!result.meta.changes)return fail('Código ocupado. Tente criar novamente.',409);return Response.json({pin,hostToken});
}
if(typeof b.pin!=='string'||!/^\d{6}$/.test(b.pin))return fail('Digite um código de 6 números.');
if(b.action==='update_avatar'){
 if(typeof b.playerId!=='string'||typeof b.playerToken!=='string'||!Number.isInteger(b.avatar)||b.avatar<0||b.avatar>11)return fail('Avatar inválido.');
 const changed=await db.prepare("UPDATE players SET avatar=? WHERE id=? AND pin=? AND token=? AND EXISTS (SELECT 1 FROM rooms WHERE pin=? AND status='lobby') RETURNING avatar").bind(b.avatar,b.playerId,b.pin,b.playerToken,b.pin).first();
 if(!changed)return fail('Não foi possível alterar o avatar. A partida já começou ou a sessão expirou.',403);
 readCache.delete(`${b.pin}:-1:lobby`);
 return Response.json(changed);
}
// Authenticate and accept answers in one atomic database statement.
if(b.action==='answer'){
 if(typeof b.playerId!=='string'||typeof b.playerToken!=='string'||!Number.isInteger(b.current)||!Number.isInteger(b.choice)||b.choice<0||b.choice>3)return fail('Resposta inválida.',400);
 const result=await db.prepare(`INSERT OR IGNORE INTO answers(id,pin,player_id,question,choice,points)
 SELECT ?1,r.pin,p.id,r.current,?5,
 CASE WHEN ?5=json_extract(r.questions,'$['||r.current||'].correct')
 THEN CAST(ROUND(900+100*MIN(1.0,MAX(0.0,(r.deadline-?7)/(1000.0*json_extract(r.questions,'$['||r.current||'].seconds'))))) AS INTEGER) ELSE 0 END
 FROM rooms r JOIN players p ON p.pin=r.pin AND p.id=?3 AND p.token=?4
 WHERE r.pin=?2 AND r.current=?6 AND r.status='question' AND r.deadline>?7 AND r.deadline>(julianday('now')-2440587.5)*86400000
 RETURNING choice`).bind(crypto.randomUUID(),b.pin,b.playerId,b.playerToken,b.choice,b.current,now).first();
 if(!result)return fail('Resposta já registrada, rodada encerrada ou sessão inválida.',409);
 return Response.json({ok:true,choice:result.choice,current:b.current});
}
if(b.action==='state'){
 const isHost=typeof b.hostToken==='string';
 let row:any;
 if(isHost)row=await db.prepare('SELECT * FROM rooms WHERE pin=? AND host_token=?').bind(b.pin,b.hostToken).first();
 else if(typeof b.playerId==='string'&&typeof b.playerToken==='string')row=await db.prepare(`SELECT r.*,p.avatar AS my_avatar,a.choice AS my_choice,a.points AS my_points
 FROM rooms r JOIN players p ON p.pin=r.pin AND p.id=? AND p.token=?
 LEFT JOIN answers a ON a.player_id=p.id AND a.question=r.current WHERE r.pin=?`).bind(b.playerId,b.playerToken,b.pin).first();
 if(!row)return fail('Sala ou sessão inválida. Entre novamente para continuar.',403);
 const questions=JSON.parse(row.questions),q=questions[row.current];
 const revealed=row.status==='finished'||(row.status==='question'&&Date.now()>=row.deadline);
 const showPlayers=row.status==='lobby'||revealed;
 // No leaderboard is calculated or transferred during an open question.
 const roster=showPlayers?await sharedRead(`${b.pin}:${row.current}:${row.status}`,row.status==='lobby'?1000:60000,async()=>{
 const sql=row.status==='lobby'?'SELECT id,name,avatar,0 AS score FROM players WHERE pin=? ORDER BY joined,id':
 'SELECT p.id,p.name,p.avatar,COALESCE(SUM(a.points),0) score FROM players p LEFT JOIN answers a ON a.player_id=p.id WHERE p.pin=? GROUP BY p.id ORDER BY score DESC,p.joined ASC,p.id ASC';
 return (await db.prepare(sql).bind(b.pin).all()).results;
 }):[];
 const count=isHost&&row.status==='question'?await sharedRead(`${b.pin}:count:${row.current}`,750,()=>db.prepare('SELECT COUNT(*) n FROM answers WHERE pin=? AND question=?').bind(b.pin,row.current).first()):null;
 return Response.json({pin:row.pin,title:row.title,status:row.status,current:row.current,total:questions.length,deadline:row.deadline,serverTime:Date.now(),players:roster,answerCount:count?.n??null,
 myAvatar:row.my_avatar??0,
 myAnswer:row.my_choice!=null?{choice:row.my_choice,...revealed?{points:row.my_points}:{}}:null,
 question:q?{text:q.text,options:q.options,seconds:q.seconds,...revealed?{correct:q.correct}:{}}:null},{headers:{'Cache-Control':'no-store'}});
}
const room:any=await db.prepare('SELECT * FROM rooms WHERE pin=?').bind(b.pin).first();if(!room)return fail('Sala não encontrada. Confira o código.',404);
if(b.action==='join'){
const avatar=b.avatar===undefined?0:b.avatar;
if(!Number.isInteger(avatar)||avatar<0||avatar>11)return fail('Avatar inválido.');
if(room.status!=='lobby')return fail('Esta competição já começou.');
if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>24)return fail('Escolha um apelido com até 24 caracteres.');
const playerId=crypto.randomUUID(),playerToken=crypto.randomUUID();
const result=await db.prepare("INSERT OR IGNORE INTO players(id,pin,token,name,joined,avatar) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE pin=? AND status='lobby')").bind(playerId,b.pin,playerToken,b.name.trim(),now,avatar,b.pin).run();
if(!result.meta.changes)return fail('Esse apelido já está em uso ou a partida começou.',409);readCache.delete(`${b.pin}:-1:lobby`);return Response.json({pin:b.pin,playerId,playerToken,avatar});
}
const host=typeof b.hostToken==='string'&&b.hostToken===room.host_token;
let player:any=null;if(typeof b.playerId==='string'&&typeof b.playerToken==='string')player=await db.prepare('SELECT id FROM players WHERE id=? AND pin=? AND token=?').bind(b.playerId,b.pin,b.playerToken).first();
if(!host&&!player)return fail('Entre novamente na sala para continuar.',403);
const questions=JSON.parse(room.questions),q=questions[room.current];
if(b.action==='advance'){
if(!host)return fail('Somente o apresentador pode avançar.',403);
if(b.current!==room.current)return fail('A rodada já mudou. Aguarde a atualização.',409);
if(room.status==='finished')return fail('A competição já terminou.');
if(room.status==='question'&&now<room.deadline)return fail('Aguarde o cronômetro terminar.');
if(room.status==='lobby'){const c:any=await db.prepare('SELECT COUNT(*) n FROM players WHERE pin=?').bind(b.pin).first();if(!c.n)return fail('Espere pelo menos um participante entrar.');}
const next=room.current+1,done=next>=questions.length;
const r=await db.prepare('UPDATE rooms SET current=?,status=?,deadline=? WHERE pin=? AND current=? AND status=?').bind(done?room.current:next,done?'finished':'question',done?0:now+questions[next].seconds*1000,b.pin,room.current,room.status).run();
if(!r.meta.changes)return fail('A rodada já mudou.',409);return Response.json({ok:true});
}
return fail('Ação desconhecida.');
}catch(e){console.error('Game request failed',e);return fail('Não foi possível conectar à sala. Tente novamente em instantes.',503)}
}
