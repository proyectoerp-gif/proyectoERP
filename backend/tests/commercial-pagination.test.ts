import { expect,it,describe } from 'vitest';
import { parseCommercialQuery, commercialFilter } from '../src/core/commercialPagination.js';
describe.each(['sales','purchase-orders'] as const)('%s pagination', kind => {
 it('bounds pages and uses session scope with state and cursor',()=>{const q=parseCommercialQuery({limit:'20',cursor:'a'.repeat(24),status:'PENDIENTE'},kind);expect(commercialFilter('co','br',q)).toEqual({companyId:'co',branchId:'br',status:'PENDIENTE',_id:{$lt:'a'.repeat(24)}});expect(parseCommercialQuery({},kind)).toEqual({limit:20});});
 it('rejects tenant overrides, invalid states, cursors and limits',()=>{for(const q of [{limit:51},{limit:0},{cursor:'bad'},{companyId:'other'},{branchId:'other'},{status:'INVALID'},{status:kind==='sales'?'RECIBIDA':'PAGADA'}])expect(()=>parseCommercialQuery(q,kind)).toThrow();});
 it('searches literal item text within the tenant and keeps the cursor for document references',()=>{
  const literal=commercialFilter('co','br',parseCommercialQuery({search:'  [SKU]  '},kind));
  expect(literal).toMatchObject({companyId:'co',branchId:'br',$or:[
   {'items.productName':{$regex:'\\[SKU\\]',$options:'i'}},
   {'items.sku':{$regex:'\\[SKU\\]',$options:'i'}},
  ]});
  const reference='a'.repeat(24),cursor='b'.repeat(24);
  expect(commercialFilter('co','br',parseCommercialQuery({search:reference,cursor},kind))).toMatchObject({
   _id:{$lt:cursor},$or:expect.arrayContaining([{_id:reference}]),
  });
  expect(()=>parseCommercialQuery({search:'x'.repeat(81)},kind)).toThrow();
 });
});
