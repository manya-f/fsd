import { io, type Socket } from 'socket.io-client';
const API_KEY='hackpulse_api_base_url';
const TOKEN_KEY='hackpulse_access_token';
export function getApiBase(){return (localStorage.getItem(API_KEY)||import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');}
export function setApiBase(value:string){localStorage.setItem(API_KEY,value.trim().replace(/\/$/,''));}
export function getToken(){return localStorage.getItem(TOKEN_KEY)||'';}
export function setToken(value:string){if(value)localStorage.setItem(TOKEN_KEY,value);else localStorage.removeItem(TOKEN_KEY);}
export function clearAuthSession(){setToken('');sessionStorage.clear();}
async function request(path:string,method:string,body?:unknown){
  const base=getApiBase();
  const headers:Record<string,string>={'Content-Type':'application/json'};const token=getToken();if(token)headers.Authorization='Bearer '+token;
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'API request failed ('+response.status+')');return {data};
}
export const api={get:(path:string)=>request(path,'GET'),post:(path:string,body:unknown)=>request(path,'POST',body)};
type ClientSocket={ready:Promise<void>;connectionId?:string;onMessage:(cb:(message:any)=>void)=>void;join:(eventId:string)=>void;disconnect:()=>void};
export const ws={connect():ClientSocket{
  const base=getApiBase();const socket:Socket=io(base||window.location.origin,{autoConnect:true,auth:{token:getToken()},transports:['websocket','polling']});
  let handler:((message:any)=>void)|undefined;
  socket.on('event:update',(data:any)=>handler?.({type:'entity.update',payload:{entity_type:'hackpulse',data}}));
  const ready=new Promise<void>((resolve,reject)=>{socket.once('connect',()=>resolve());socket.once('connect_error',reject);});
  return {ready,get connectionId(){return socket.id;},onMessage(cb){handler=cb;},join(eventId){socket.emit('event:join',eventId);},disconnect(){socket.disconnect();}};
}};
