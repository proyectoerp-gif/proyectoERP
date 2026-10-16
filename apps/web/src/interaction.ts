export type Confirmation={id:number;message:string;title:string;confirmLabel:string;danger:boolean};
type Options=Partial<Pick<Confirmation,'title'|'confirmLabel'|'danger'>>;
export function createConfirmationBroker(){
  let listener:((value:Confirmation|null)=>void)|undefined,sequence=0,pending:{id:number;resolve:(value:boolean)=>void}|undefined;
  const settle=(id:number,value:boolean)=>{if(pending?.id!==id)return;const current=pending;pending=undefined;listener?.(null);current.resolve(value);};
  return {
    attach(handler:(value:Confirmation|null)=>void){listener=handler;return()=>{if(listener!==handler)return;listener=undefined;if(pending){const current=pending;pending=undefined;current.resolve(false);}};},
    request(message:string,options:Options={}):Promise<boolean>{
      if(!listener||pending)return Promise.resolve(false);
      return new Promise(resolve=>{const id=++sequence;pending={id,resolve};listener?.({id,message,title:options.title??'Revisa antes de continuar',confirmLabel:options.confirmLabel??'Confirmar operación',danger:options.danger??false});});
    },
    settle
  };
}
export const confirmationBroker=createConfirmationBroker();
export const confirmAction=(message:string,options?:Options)=>confirmationBroker.request(message,options);
type Notice={message:string;kind:'success'|'info'};
let noticeListener:((notice:Notice)=>void)|undefined;
export function listenForNotices(listener:(notice:Notice)=>void){noticeListener=listener;return()=>{if(noticeListener===listener)noticeListener=undefined;};}
export const notifySuccess=(message:string)=>noticeListener?.({message,kind:'success'});
export const notifyInfo=(message:string)=>noticeListener?.({message,kind:'info'});
export function canLeaveWorkspace(){
  if(typeof document==='undefined'||!document.querySelector('[data-operation-pending="true"]'))return true;
  notifyInfo('Espera a que termine el guardado antes de cambiar de sección o cerrar sesión.');return false;
}
