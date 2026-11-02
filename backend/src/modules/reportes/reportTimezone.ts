import {getCompanyModel} from '../empresas/models/Company.js';
import type {ReportPeriod} from './models/Report.js';
export function validTimezone(value:string){try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;}catch{return false;}}
export async function companyTimezone(companyId:string){const row=await getCompanyModel().findById(companyId).select('timezone').lean();return row?.timezone&&validTimezone(row.timezone)?row.timezone:'America/Mexico_City';}
function parts(date:Date,timezone:string){const values=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(values.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
export function localDate(date:Date,timezone:string){const p=parts(date,timezone);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;}
export function zonedPeriodStart(period:ReportPeriod,now:Date,timezone:string){
 const p=parts(now,timezone),wall=new Date(Date.UTC(p.year,p.month-1,p.day));
 if(period==='week')wall.setUTCDate(wall.getUTCDate()-((wall.getUTCDay()+6)%7));
 if(period==='month')wall.setUTCDate(1);
 if(period==='quarter')wall.setUTCMonth(Math.floor(wall.getUTCMonth()/3)*3,1);
 if(period==='year')wall.setUTCMonth(0,1);
 // Find the first instant of the local calendar date, including zones whose DST
 // transition skips midnight. Binary search avoids assuming a fixed UTC offset.
 const target=wall.toISOString().slice(0,10);let lo=wall.getTime()-36*3600000,hi=wall.getTime()+36*3600000;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(localDate(new Date(mid),timezone)<target)lo=mid;else hi=mid;}
 return new Date(hi);
}
