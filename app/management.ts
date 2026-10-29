import {env} from 'cloudflare:workers';
const cookieName='__Host-semest-management';
const encoder=new TextEncoder();
const attempts=new Map<string,{count:number,until:number}>();
async function signature(value:string){
 const secret=(env as any).MANAGEMENT_SESSION_SECRET;
 if(!secret)throw Error('Management secret unavailable');
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
}
function equal(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
export async function managementUser(req:Request){
 const token=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
 const [expiry,nonce,mac]=token.split('.');
 const valid=/^\d+$/.test(expiry||'')&&Number(expiry)>Date.now()&&Number(expiry)<=Date.now()+43200000&&/^[a-f0-9-]{36}$/.test(nonce||'')&&/^[a-f0-9]{64}$/.test(mac||'');
 const allowed=!!valid&&equal(mac,await signature(expiry+'.'+nonce));
 return {allowed};
}
export async function managementLogin(req:Request,password:unknown){
 const now=Date.now(),ip=req.headers.get('cf-connecting-ip')||'unknown';
 const previous=attempts.get(ip);const attempt=previous&&previous.until>now?previous:{count:0,until:now+60000};
 if(attempt.count>=8)return Response.json({error:'Muitas tentativas. Aguarde um minuto.'},{status:429});
 if(attempts.size>2000)attempts.clear();attempt.count++;attempts.set(ip,attempt);
 const expected=(env as any).MANAGEMENT_PASSWORD;
 if(!expected)return Response.json({error:'Acesso da gestão indisponível.'},{status:503});
 if(typeof password!=='string'||!equal(password,expected))return Response.json({error:'Senha incorreta.'},{status:403});
 attempts.delete(ip);
 const value=String(now+43200000)+'.'+crypto.randomUUID();
 return Response.json({canManage:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`${cookieName}=${value}.${await signature(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}});
}
export function managementLogout(){return Response.json({canManage:false},{headers:{'Cache-Control':'no-store','Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});}
