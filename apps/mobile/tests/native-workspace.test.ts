import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accentOptions,contrast,makeTheme,parseAppearance,themedColor} from '../src/themeModel';
import {navigationGroups,pageInfo,searchPages,visibleNavigation} from '../../../shared/constants/navigation';
import {activityPayload,validDate} from '../src/activityValidation';
import type {Activity} from '../src/commercialActivityApi';
test('native and web use eight permission-filtered areas with the same searchable sections',()=>{
 assert.equal(navigationGroups.length,8);const pages=navigationGroups.flatMap(g=>g.pages);assert.equal(new Set(pages).size,pages.length);assert.deepEqual([...pages].sort(),Object.keys(pageInfo).sort());
 assert.deepEqual(visibleNavigation(['soporte.ver']).map(g=>g.id),['support']);assert.equal(searchPages(['productos.ver'],'soporte').length,0);assert.equal(searchPages(['soporte.ver'],'tickets')[0].page,'tickets');assert.equal(searchPages(['inventario.ver'],'almacén')[0].page,'inventory');
});
test('appearance accepts only supported persisted values and keeps body and accent text legible',()=>{
 assert.deepEqual(parseAppearance({mode:'bad',font:'other',accent:'red',token:'must-not-persist'}),{mode:'light',font:'modern',accent:'#14786b'});
 for(const mode of ['light','dark'] as const)for(const accent of [...accentOptions,'#ffffff','#000000','#888888']){const t=makeTheme({mode,accent,font:'modern'});assert.ok(contrast(t.text,t.surface)>=4.5);assert.ok(contrast(t.muted,t.surface)>=4.5);assert.ok(contrast(t.link,t.surface)>=4.5);assert.ok(contrast(t.accent,t.onAccent)>=4.5);assert.equal(themedColor('#F1F5F9',t),t.text);assert.equal(themedColor('#111923',t),t.surface);assert.equal(themedColor('#F87171',t),t.danger);}
});
const state={canceled:false,unknownLegacy:false,outstanding:25,refundable:10,paid:25,items:[{productId:'a'.repeat(24),productName:'Silla',quantity:4,delivered:3,returned:1}]} as Activity;
const form={action:'PAYMENT' as const,date:'2026-10-19',note:'Anticipo de prueba',amount:'20.50',dueDate:'2026-10-30',accountId:'b'.repeat(24),warehouseId:'c'.repeat(24),quantities:{}};
test('native movements reject invalid dates, overpayments, excess returns and cancellation after movements',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2028-02-29'),true);
 assert.equal(activityPayload(state,form).amount,20.5);
 for(const amount of ['25.01','0','-1','1.001','Infinity'])assert.throws(()=>activityPayload(state,{...form,amount}));
 assert.throws(()=>activityPayload(state,{...form,action:'RETURN',quantities:{['a'.repeat(24)]:'2.000001'}}));
 assert.deepEqual(activityPayload(state,{...form,action:'RETURN',quantities:{['a'.repeat(24)]:'2'}}).items,[{productId:'a'.repeat(24),quantity:2}]);
 assert.throws(()=>activityPayload(state,{...form,action:'DELIVERY',quantities:{['a'.repeat(24)]:'2'}}));
 assert.throws(()=>activityPayload(state,{...form,action:'CANCEL'}));
 assert.throws(()=>activityPayload({...state,canceled:true},form));
 assert.throws(()=>activityPayload(state,{...form,action:'TERMS',dueDate:'2026-02-30'}));
});
