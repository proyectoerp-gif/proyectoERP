import {expect,it} from 'vitest';
import {resolveShoppingQuestion,type ShoppingProduct} from '../src/modules/demoSupport/shopping.js';
import {fashionProducts} from '../src/scripts/fashionCatalogData.js';
const rows:ShoppingProduct[]=fashionProducts.map((row,index)=>({...row,id:(index+1).toString(16).padStart(24,'0'),updatedAt:new Date('2026-11-09T00:00:00Z')}));
it('adds explicit names, plurals, Spanish quantities and SKUs with exact catalog arithmetic',()=>{
  const cases=[['Si compro 2 Camisa Lino y 1 Jeans Rectos, ¿cuánto me saldría?',2797],['¿Cuánto cuestan dos camisas de lino y tres camisetas esenciales?',2845],['¿Cuánto cuesta 2 ALB-MOD-004 y 1 ALB-MOD-008?',2797],['Quiero 2x Camisa Lino y Jeans Rectos',2797]] as const;
  for(const [question,total] of cases){const result=resolveShoppingQuestion(question,rows)!;expect(result.text,question).toContain(total.toLocaleString('es-MX',{minimumFractionDigits:2}));expect(result.catalogSelection?.length,question).toBe(2);expect(result.engine).toBe('guided');}
});
it('uses cents, consolidates repeated articles and never calculates a partial or ambiguous total',()=>{
  const decimal=rows.map(row=>row.name==='Camisa Lino'?{...row,price:10.01}:row.name==='Jeans Rectos'?{...row,price:20.02}:row);
  expect(resolveShoppingQuestion('Total por 3 Camisa Lino y 2 Jeans Rectos',decimal)?.text).toContain('70.07');
  expect(resolveShoppingQuestion('Total 2 Camisa Lino y 1 Camisa Lino',rows)?.catalogSelection).toEqual([{productId:rows[3].id,quantity:3}]);
  for(const question of ['Cuánto por una camisa','Total por Camisa Lino y un sombrero','Cuánto por 0 Camisa Lino','Total por 101 Camisa Lino','Total por 1,5 Camisa Lino','Total por -2 Camisa Lino'])expect(resolveShoppingQuestion(question,rows)?.text,question).not.toContain('Total estimado:');
});
it('finds both price extremes and handles ties without using a first-page assumption',()=>{
  const result=resolveShoppingQuestion('Cuál es la prenda más barata y la más cara de la tienda',rows)!;
  expect(result.text).toContain('Gorra Algodón');expect(result.text).toContain('299.00');expect(result.text).toContain('Trench Ligero');expect(result.text).toContain('2,199.00');
  const tied=[...rows,{...rows[18],id:'f'.repeat(24),sku:'TIE',name:'Gorra empatada'}];expect(resolveShoppingQuestion('La más barata',tied)?.text).toContain('Gorra empatada');
  expect(resolveShoppingQuestion('Cuál es el abrigo más barato',rows)?.text).toContain('Trench Ligero');
  expect(resolveShoppingQuestion('Cuál es la prenda azul más barata',rows)?.text).toContain('Camisa Oxford');
  expect(resolveShoppingQuestion('Cuál es el sombrero más barato',rows)?.text).not.toContain('Precio más bajo:');
  expect(resolveShoppingQuestion('Cuál es la más barata por menos de 100 pesos',rows)?.text).not.toContain('Precio más bajo:');
  expect(resolveShoppingQuestion('Cuál es la más cara hasta 500 pesos',rows)?.text).toContain('Top Textura');
});
it('re-reads current prices and uses structured context without guessing ambiguous quantities',()=>{
  const first=resolveShoppingQuestion('Total 2 Camisa Lino y 1 Jeans Rectos',rows)!;
  const follow=resolveShoppingQuestion('y dos de cada una?',rows,{previousSelection:first.catalogSelection})!;
  expect(follow.text).toContain('3,796.00');
  const selected=resolveShoppingQuestion('Cuánto me salen 3?',rows,{selectedProductId:rows[3].id});expect(selected?.text).toContain('2,697.00');
  const changed=rows.map(row=>row.id===rows[3].id?{...row,price:100}:row);
  expect(resolveShoppingQuestion('Cuánto por esas?',changed,{previousSelection:first.catalogSelection})?.text).toContain('1,199.00');
  expect(resolveShoppingQuestion('Y esas dos cuánto suman?',rows,{previousSelection:first.catalogSelection})?.text).not.toContain('Total estimado:');
  expect(resolveShoppingQuestion('y 3 más?',rows,{previousSelection:[{productId:rows[3].id,quantity:2}]})?.text).toContain('4,495.00');
  expect(resolveShoppingQuestion('y 1 menos?',rows,{previousSelection:[{productId:rows[3].id,quantity:2}]})?.text).toContain('899.00');
});
it('keeps unrelated help outside price resolution and refuses unknown discounts or unsafe prices',()=>{
  expect(resolveShoppingQuestion('Quiero saber el horario',rows)).toBeNull();
  expect(resolveShoppingQuestion('Cuánto tiempo tarda una entrega',rows)).toBeNull();
  expect(resolveShoppingQuestion('Cuánto por 2 Camisa Lino con 10% de descuento',rows)?.text).not.toContain('Total estimado:');
  expect(resolveShoppingQuestion('Cuál es la más barata',[{...rows[0],price:NaN}])?.text).not.toContain('NaN');
});
