import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement as h,Fragment,isValidElement} from 'react';
import {keyedRecordChildren} from '../src/presentationChildren';
test('record fragments retain unique keys beside ordinary summary fields',()=>{
 const input=[h('span',null,'Name'),h(Fragment,null,h('span',null,'Code'),h('span',null,'Price')),h(Fragment,null,h('span',null,'Status'))];
 const rows=keyedRecordChildren(input),keys=rows.filter(isValidElement).map(row=>row.key);
 assert.equal(keys.length,4);assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual(rows.filter(isValidElement).map(row=>(row.props as {children:string}).children),['Name','Code','Price','Status']);
});
test('keyed record details keep their identity after reordering',()=>{
 const a=h(Fragment,{key:'contact'},h('span',{key:'mail'},'Mail')),b=h(Fragment,{key:'product'},h('span',{key:'sku'},'SKU'));
 const read=(children:ReturnType<typeof h>[])=>Object.fromEntries(keyedRecordChildren(children).filter(isValidElement).map(row=>[(row.props as {children:string}).children,row.key]));
 assert.deepEqual(read([a,b]),read([b,a]));
});
test('empty optional record details do not create rows',()=>assert.deepEqual(keyedRecordChildren([null,false,h(Fragment,null)]),[]));
