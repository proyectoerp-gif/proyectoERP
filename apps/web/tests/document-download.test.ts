import {test} from 'node:test';
import assert from 'node:assert/strict';
import {read,utils} from 'xlsx';
import {downloadDocument} from '../src/downloadDocument';
const doc={title:'Lista de lámparas',company:'company-promaxima-demo',branch:'branch-promaxima-demo',note:'Datos ficticios',columns:['Nombre'],rows:[['Lámpara de prueba']]};
test('canceled exports do not create or download any file',async()=>{const c=new AbortController();c.abort();await assert.rejects(downloadDocument(doc,'pdf',c.signal),/cancelada/);await assert.rejects(downloadDocument(doc,'xlsx',c.signal),/cancelada/);});
test('Excel downloads a real workbook with a descriptive filename and the current demo identity',async t=>{
 const previous=(globalThis as any).window;t.after(()=>{(globalThis as any).window=previous;});let clicked=false,removed=false;const link:any={click:()=>{clicked=true;},remove:()=>{removed=true;}};
 (globalThis as any).window={document:{createElement:(tag:string)=>{assert.equal(tag,'a');return link;},body:{appendChild:()=>{}}}};
 await downloadDocument(doc,'xlsx');assert.equal(clicked,true);assert.equal(removed,true);assert.match(link.download,/Lista-de-lamparas-.*\.xlsx$/);
 const wb=read(await(await fetch(link.href)).arrayBuffer(),{type:'array'});const info=utils.sheet_to_json(wb.Sheets['Información'],{header:1}) as string[][];
 assert.equal(info.find(r=>r[0]==='Empresa')?.[1],'Albor Oficina y Hogar · Demo');assert.equal(info.find(r=>r[0]==='Sucursal')?.[1],'Sucursal de pruebas');assert.equal(wb.Sheets.Datos.A2.v,'Lámpara de prueba');
});
