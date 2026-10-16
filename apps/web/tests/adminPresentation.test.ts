import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {metricPresentation,statusTone,usesAdminPresentation} from '../src/adminPresentation';
import {AdminCreatePanel,AdminDataTable,AdminPresentationContext,StatusBadge} from '../src/AdminUi';
test('administrator presentation needs both existing management capabilities',()=>{
  for(const permissions of [[],['usuarios.editar'],['roles.editar'],['ventas.ver','ventas.crear']])assert.equal(usesAdminPresentation(permissions),false);
  assert.equal(usesAdminPresentation(['usuarios.editar','roles.editar']),true);
});
test('financial amounts remain amounts without inventing currency; catalog and staff remain counts',()=>{
  for(const key of ['sales','purchases','cash']){assert.equal(metricPresentation(key,12).value,'12.00');assert.match(metricPresentation(key,12).unit,/moneda no informada/);}
  assert.equal(metricPresentation('cash',-12.3).value,'-12.30');
  assert.equal(metricPresentation('employees',12).value,'12');assert.equal(metricPresentation('inventory',12).unit,'Productos del catálogo');
});
test('status styling leaves the underlying state and its accessible label visible',()=>{
  assert.equal(statusTone('PAGADA'),'success');assert.equal(statusTone('CANCELADA'),'danger');assert.equal(statusTone('PENDIENTE'),'warning');assert.equal(statusTone('not-a-business-state'),'neutral');
  const html=renderToStaticMarkup(React.createElement(StatusBadge,{status:'APROBADA',label:'Lista para recibir'}));assert.match(html,/Lista para recibir/);
});
test('operators retain disclosures and administrators receive a native dialog with a retained form tree',()=>{
  const element=(admin:boolean)=>React.createElement(AdminPresentationContext.Provider,{value:admin},React.createElement(AdminCreatePanel,{title:'Nueva venta',children:React.createElement('input',{'aria-label':'Cantidad',defaultValue:'2'})}));
  const operator=renderToStaticMarkup(element(false));assert.match(operator,/<details/);assert.match(operator,/Crear una venta/);assert.doesNotMatch(operator,/<dialog/);
  const administrator=renderToStaticMarkup(element(true));assert.match(administrator,/<dialog/);assert.match(administrator,/aria-haspopup="dialog"/);assert.match(administrator,/value="2"/);
});
test('responsive table keeps real headers, captions and cell labels',()=>{
  const html=renderToStaticMarkup(React.createElement(AdminDataTable<{id:string;name:string}>,{label:'Clientes',rows:[{id:'one',name:'Cliente de prueba'}],rowKey:row=>row.id,columns:[{key:'name',label:'Nombre',render:row=>row.name}]}));
  assert.match(html,/<caption[^>]*>Clientes<\/caption>/);assert.match(html,/scope="col"/);assert.match(html,/data-label="Nombre"/);assert.match(html,/Cliente de prueba/);
});
