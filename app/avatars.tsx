"use client";
import {useState} from 'react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
const hats=['Sem chapéu','Boné SEMEST','Coroa'];
const glasses=['Roxo clássico','Preto','Redondo','Azul'];
export function SemestAvatar({value=0,large=false}:{value?:number;large?:boolean}){
 const safe=Number.isInteger(value)&&value>=0&&value<12?value:0;
 return <span role="img" aria-label={`Semestinho: ${hats[Math.floor(safe/4)]}, óculos ${glasses[safe%4]}`} className={'semest-avatar'+(large?' avatar-large':'')} style={{backgroundPosition:`${(safe%4)*100/3}% ${Math.floor(safe/4)*50}%`}}/>;
}
export function AvatarPicker({value,onChange,disabled=false}:{value:number;onChange:(v:number)=>void;disabled?:boolean}){
 return <div className="avatar-picker"><SemestAvatar value={value} large/><div className="avatar-controls"><strong>Seu Semestinho</strong><fieldset disabled={disabled}><legend>Chapéu</legend><RadioGroup className="avatar-options" aria-label="Chapéu do Semestinho" value={String(Math.floor(value/4))} onValueChange={v=>onChange(Number(v)*4+value%4)}>{hats.map((label,i)=><label key={i} className={Math.floor(value/4)===i?'active':''}><RadioGroupItem value={String(i)}/>{label}</label>)}</RadioGroup></fieldset><fieldset disabled={disabled}><legend>Óculos</legend><RadioGroup className="avatar-options" aria-label="Óculos do Semestinho" value={String(value%4)} onValueChange={v=>onChange(Math.floor(value/4)*4+Number(v))}>{glasses.map((label,i)=><label key={i} className={value%4===i?'active':''}><RadioGroupItem value={String(i)}/>{label}</label>)}</RadioGroup></fieldset></div></div>;
}
export function LobbyAvatar({value,onSave,busy}:{value:number;onSave:(value:number)=>Promise<void>;busy:boolean}){
 const [draft,setDraft]=useState(value),[saved,setSaved]=useState(false);
 return <details className="avatar-customize"><summary><SemestAvatar value={value}/><span>Meu Semestinho · personalizar</span></summary><AvatarPicker value={draft} onChange={v=>{setDraft(v);setSaved(false)}} disabled={busy}/><button className="secondary" disabled={busy||draft===value} onClick={()=>{void onSave(draft).then(()=>setSaved(true)).catch(()=>setSaved(false))}}>Salvar avatar</button><p role="status" className="avatar-status">{draft!==value?'Você tem alterações para salvar.':saved?'Avatar salvo!':'Você pode mudar enquanto a sala estiver aberta.'}</p></details>;
}
