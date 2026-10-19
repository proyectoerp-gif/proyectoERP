import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectExportPages} from '../src/pagedExport.ts';
import {transactionsDocument,balancesDocument} from '../src/listDocuments.ts';
import {documentPdf} from '../src/exportPdf.ts';
import {documentWorkbook} from '../src/exportWorkbook.ts';
import {utils,write,read} from 'xlsx';
import {identifyExport} from '../src/ExportIdentity.tsx';
import {exportNames} from '../src/exportNames.ts';

test('unreadable catalog names fall back to identifiers, but expired sessions and server failures abort export',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let status=403;
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:{message:'Acceso no disponible'}}),{status,headers:{'Content-Type':'application/json'}});
 const run=()=>exportNames('https://example.test/api','test-token',new AbortController().signal,[{kind:'products',prefix:'product',ids:['a'.repeat(24)]}]);
 assert.deepEqual(await run(),{});status=401;await assert.rejects(run);status=503;await assert.rejects(run);
});

test('export headers use the current tenant name without relabeling foreign or company-wide documents',()=>{
 const document={title:'Prueba',company:'co',branch:'br',note:'',columns:[],rows:[]};
 const identity={companyId:'co',branchId:'br',companyName:'Albor Oficina y Hogar',branchName:'Sucursal de pruebas'};
 assert.equal(identifyExport(document,identity).company,'Albor Oficina y Hogar');
 assert.equal(identifyExport({...document,company:'foreign'},identity).company,'foreign');
 assert.equal(identifyExport({...document,branch:undefined},identity).branch,undefined);
 assert.equal(document.company,'co');
});

test('exports traverse all pages and reject duplicate rows, cycles, empty continuation and cancellation',async()=>{
 const signal=new AbortController().signal;
 assert.deepEqual(await collectExportPages(async c=>c?{items:[{id:'b'}],nextCursor:null}:{items:[{id:'a'}],nextCursor:'next'},r=>r.id,signal),[{id:'a'},{id:'b'}]);
 await assert.rejects(()=>collectExportPages(async()=>({items:[{id:'a'}],nextCursor:'next'}),r=>r.id,signal),/cambiaron|repitió/);
 await assert.rejects(()=>collectExportPages(async()=>({items:[],nextCursor:'next'}),r=>String(r),signal),/incompleta/);
 const canceled=new AbortController();canceled.abort();let fetched=false;
 await assert.rejects(()=>collectExportPages(async()=>{fetched=true;return {items:[],nextCursor:null};},r=>String(r),canceled.signal),/cancelada/);assert.equal(fetched,false);
 await assert.rejects(()=>collectExportPages(async()=>({items:Array.from({length:10001},(_,i)=>({id:String(i)})),nextCursor:null}),r=>r.id,signal),/10,000/);
});
test('multi-product exports show the original total once and do not claim partial payments are settled',()=>{
 const doc=transactionsDocument('sales',[{id:'sale',partnerId:'customer',productId:'p1',quantity:3,unitPrice:10,total:40,status:'PENDIENTE',activityVersion:2,items:[{productId:'p1',productName:'Libreta',sku:'L1',quantity:2,unitPrice:10,total:20},{productId:'p2',productName:'Lápiz',sku:'L2',quantity:1,unitPrice:20,total:20}]}],{'partner:customer':'Cliente de ejemplo'},'Empresa','Sucursal','Todos');
 assert.equal(doc.rows.length,2);assert.equal(doc.rows[0][9],40);assert.equal(doc.rows[1][9],'');assert.equal(doc.rows[1][4],'Lápiz');assert.match(doc.note,/pagos, entregas o devoluciones parciales/);
});
test('PDF is a real multipage file and Excel preserves numeric cells and literal formula-like names',()=>{
 const doc=balancesDocument(Array.from({length:150},(_,i)=>({productId:String(i),warehouseId:'w',productName:i===0?'=HYPERLINK("test")':'Lámpara número '+i,warehouseName:'Almacén de pruebas',quantity:12.5})), 'Lámparas');
 const pdf=documentPdf(doc);assert.ok(pdf.getNumberOfPages()>1);assert.equal(new TextDecoder().decode(pdf.output('arraybuffer').slice(0,5)),'%PDF-');
 const wb=read(write(documentWorkbook(doc),{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 assert.equal(wb.Sheets.Datos.A2.t,'s');assert.equal(wb.Sheets.Datos.A2.f,undefined);assert.equal(wb.Sheets.Datos.E2.t,'n');assert.equal(wb.Sheets.Datos.E2.v,12.5);
 assert.equal(utils.sheet_to_json(wb.Sheets.Datos).length,150);
});
