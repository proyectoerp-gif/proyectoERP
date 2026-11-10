import {getProductModel} from '../productos/models/Product.js';
import {demoScope} from './knowledge.js';
import type {ChatAnswer} from './generative.js';

export type CatalogSelection={productId:string;quantity:number}[];
export type ShoppingProduct={id:string;name:string;sku:string;price:number;updatedAt?:Date;apparel?:{color?:string;audience?:string;garment?:string}};
type Context={selectedProductId?:string;previousSelection?:CatalogSelection};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const aliases:Record<string,string>={pantalones:'pantalon',esenciales:'esencial',jean:'jeans',camisetas:'camiseta',camisas:'camisa',prendas:'prenda',articulos:'articulo',productos:'producto'};
const singular=(value:string)=>['dos','tres','seis'].includes(value)?value:Object.hasOwn(aliases,value)?aliases[value]:value.endsWith('s')&&value!=='jeans'?value.slice(0,-1):value;
const words=(value:string)=>normalize(value).split(/[^a-z0-9-]+/).filter(Boolean).map(singular);
const ignored=new Set(words('entre diferencia misma mismo mismas mismos anterior anteriores opcion opciones disponible disponibles su actual actuales ver sobre esto puede hay lo tiene tu tengas tenga venden vendes manejan maneja coleccion colecciones ropa si me compro comprar comprara compraria compro comprarme llevo llevar llevarme quiero quisiera necesito cuanto cuesta cuestan costaria costarian saldria saldrian saldra sale salen saldran seria serian es son el la los las un una uno unos unas de del al para por en con a y o e mas menos total precio precios cotizacion cotiza cotizar presupuesto suma sumar suman sumaria valen vale tienda catalogo prenda prendas articulo articulos producto productos favor hola gracias hola me mi que cual cuales cuanto cuanto cuanto costara costaran informacion esos esas este esta estos estas eso esa ese ambos ambas cada unidad unidades pieza piezas tienen tienes puedes podria podrias decir decirme dar darme calcular calcularme calcularlo todo todos todas junto juntos cuanto pagaria pagare pagar cuesta saldrian cuantos saldria saldria pagar comprarlo comprarlas comprar las tambien entonces ahora tendria tendrian quiero saber cuanto dinero gastaria gaste me gustaria saber el resultado seria'));
const numbers:Record<string,number>={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20};
const money=(cents:number)=>(cents/100).toLocaleString('es-MX',{style:'currency',currency:'MXN',currencyDisplay:'code'});
const cents=(row:ShoppingProduct)=>Math.round(row.price*100);
const isPrice=(row:ShoppingProduct)=>Number.isFinite(row.price)&&row.price>=0&&Number.isSafeInteger(cents(row))&&Number(row.price.toFixed(2))===row.price;
const minimum=(q:string)=>/mas (?:barat|economic)|menor precio|precio mas bajo|menos cuesta|cuestan? menos|menor costo/.test(q);
const maximum=(q:string)=>/mas car[oa]|mayor precio|precio mas alto|mas cuesta|cuestan? mas|mayor costo/.test(q);
const extreme=(q:string)=>minimum(q)&&maximum(q)?'both':minimum(q)?'min':maximum(q)?'max':null;
const priceIntent=(q:string)=>!!extreme(q)||/\b(?:cuanto|cuesta|cuestan|costaria|costarian|saldria|saldrian|saldra|salen|total|precio|precios|cotiz\w*|presupuesto|compr\w*|llevo|llevar\w*|sumar|suman|vale|valen|diferencia|pagaria)\b/.test(q)||/\b(?:quiero|quisiera)\b/.test(q)&&/camis|jeans|pantal|prenda|falda|vestido|blazer|chaqueta|abrigo|bolso|gorra|bufanda|alb-mod|sku|sombrero/.test(q);
const budgetPattern=/\b(?:menos de|hasta|no mas de|por debajo de)\s*\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:pesos|mxn)?/;
const priceCeiling=(q:string)=>{const match=q.match(budgetPattern);return match?{amount:Number(match[1].replace(',','.')),strict:/menos de|debajo de/.test(match[0])}:null;};
const source=()=>({id:'catalog-prices',title:'Precios del catálogo público',version:new Date().toISOString(),name:'Catálogo activo · Albor Moda'});
function answer(text:string,rows:ShoppingProduct[]=[],selection?:CatalogSelection):ChatAnswer {
  const sources=rows.map(row=>({id:'catalog-'+row.id,title:row.name,version:row.updatedAt?new Date(row.updatedAt).toISOString():new Date().toISOString(),name:'Catálogo activo · Albor Moda'}));
  return {text,source:sources[0]??source(),sources:sources.length?sources:[source()],needsHuman:false,engine:'guided',...(selection?{catalogSelection:selection}:{})};
}
function hints(rows:ShoppingProduct[]){return rows.slice(0,5).map(row=>`${row.name} (${row.sku}) · ${money(cents(row))}`).join('\n');}
const garmentWords:Record<string,string>={tee:'camiseta top',shirt:'camisa sobrecamisa',knit:'punto jersey cardigan top',trousers:'pantalon',jeans:'jeans pantalon',skirt:'falda',dress:'vestido',blazer:'blazer',jacket:'chaqueta',coat:'abrigo trench gabardina',bag:'bolso',cap:'gorra',scarf:'bufanda'};
const productWords=(row:ShoppingProduct)=>new Set(words(row.name+' '+row.sku+' '+(row.apparel?.color??'')+' '+(row.apparel?.audience??'')+' '+(garmentWords[row.apparel?.garment??'']??'')));
function tokens(value:string){return words(value.replace(/\btallas?\s+(?:xxl|xl|xs|s|m|l|unica)\b/g,'')).filter(word=>!ignored.has(word)&&!Object.hasOwn(numbers,word)&&!/^\d+$/.test(word)&&word!=='x'&&word!=='sku'&&word!=='referencia');}
function quantity(value:string):number|null {
  // SKU digits are removed by the caller; fractions and negative values must never become integers.
  value=value.replace(/[¿?¡!():]/g,' ').replace(/\bcada (?:una|uno)\b/g,'cada');
  const digits=value.match(/(?:^|\s)(-?\d+(?:[.,]\d+)?)(?=\s|x\b|$)/g)?.map(text=>Number(text.trim()));
  const verbal=words(value).filter(word=>Object.hasOwn(numbers,word)).map(word=>numbers[word]);
  const found=digits?.length?digits:verbal.length?verbal:[1];
  if(found.length!==1||!Number.isInteger(found[0])||found[0]<1||found[0]>100)return null;
  return found[0];
}
export function resolveShoppingQuestion(question:string,products:ShoppingProduct[],context:Context={}):ChatAnswer|null {
  const q=normalize(question);
  if(/cuanto (?:tiempo|tarda|demora)|horario|lavar|cuidados/.test(q))return null;
  if(context.selectedProductId&&/disponibilidad|talla|color|material|informacion/.test(q)&&!/(?:\b\d+\b|\bdos\b|\btres\b)/.test(q))return null;
  if(!priceIntent(q)&&!((context.selectedProductId||context.previousSelection?.length)&&/\b(?:\d+|dos|tres|cuatro|cinco|seis|cada)\b/.test(q)))return null;
  if(/\b(?:descuent\w*|cupon\w*|impuest\w*|iva|envio|rebaja\w*|promocion\w*)\b|%/.test(q))return answer('Puedo sumar los precios actuales de las prendas. No tengo un importe confirmado de envío, impuestos adicionales o descuentos para calcular un total final con esas condiciones. Dime los nombres o referencias y cantidades para darte el subtotal del catálogo.');
  const ceiling=priceCeiling(q),mode=extreme(q);
  const rows=products.filter(row=>isPrice(row)&&(!mode||!ceiling||(ceiling.strict?row.price<ceiling.amount:row.price<=ceiling.amount)));
  if(!rows.length)return answer('No encontré prendas con precio válido en el catálogo activo para esta consulta. Prueba otra colección o solicita ayuda al equipo.');
  if(mode){
    const rankWords=new Set(words('barata barato economica economico cara caro menor mayor bajo alto'));
    const rankedQuestion=q.replace(budgetPattern,'');
    const terms=tokens(rankedQuestion).filter(word=>!rankWords.has(word));
    let ranked=rows;
    if(/(?:entre|de) (?:esas|estas|esos|estos)|anteriores/.test(q)&&context.previousSelection?.length)ranked=rows.filter(row=>context.previousSelection!.some(item=>item.productId===row.id));
    else if(terms.length){
      if(products.length>200)return answer('Para comparar esas características en un catálogo amplio, consulta una colección o prenda concreta con el equipo.');
      const subsets=rankedQuestion.split(/[,;]|\b(?:y|con)\b/).map(part=>tokens(part).filter(word=>!rankWords.has(word))).filter(part=>part.length);
      const matches=subsets.map(part=>rows.filter(row=>{const haystack=productWords(row);return part.every(word=>haystack.has(word));}));
      if(matches.some(part=>!part.length))return answer('No encontré prendas que coincidan con todas las características indicadas. Dime el nombre completo o la colección que quieres comparar.');
      ranked=[...new Map(matches.flat().map(row=>[row.id,row])).values()];
    }
    if(!ranked.length)return answer('Las prendas anteriores ya no están disponibles en el catálogo activo. Indica qué prendas quieres comparar.');
    if(mode==='both'&&products.length>200)return answer('Para comparar un catálogo tan amplio, pregúntame primero por la más barata y después por la más cara.');
    const extremes=mode==='both'?['min','max']: [mode];
    const result=extremes.map(direction=>{
      const price=direction==='min'?Math.min(...ranked.map(cents)):Math.max(...ranked.map(cents));
      const tied=ranked.filter(row=>cents(row)===price).sort((a,b)=>a.sku.localeCompare(b.sku));
      return {tied,text:(direction==='min'?'Precio más bajo':'Precio más alto')+':\n'+hints(tied)+(tied.length>5?'\nHay más prendas empatadas.':'')};
    });
    const selected=[...new Map(result.flatMap(part=>part.tied.slice(0,5)).map(row=>[row.id,row])).values()];
    return answer(result.map(part=>part.text).join('\n\n')+'\nPrecios actuales del catálogo consultado en MXN. La disponibilidad la confirma el equipo.',selected,selected.map(row=>({productId:row.id,quantity:1})));
  }
  if(products.length>200)return answer('El catálogo es amplio. Para calcular sin omitir prendas, consulta un producto desde su ficha o solicita ayuda con sus referencias.');
  // A decimal quantity split at a comma must never accidentally become a different integer.
  if(/\b\d+[.,]\d+\b/.test(q))return answer('Para esta estimación usa cantidades enteras de 1 a 100 por prenda. Por ejemplo: «2 Camisas Lino y 1 Jeans Rectos».');
  const previous=context.selectedProductId?[{productId:context.selectedProductId,quantity:1}]:context.previousSelection??[];
  const parts=q.split(/[,;\n+]|\b(?:y|con)\b/).map(part=>part.trim()).filter(Boolean);
  const selected=new Map<string,number>(),unresolved:string[]=[],ambiguous:ShoppingProduct[]=[];
  for(const part of parts){
    let quantityText=part;
    const skuMatches=rows.filter(row=>{
      const sku=normalize(row.sku),compact=sku.replace(/[^a-z0-9]/g,'');
      const boundary=part.split(/\s+/).some(token=>token.replace(/[^a-z0-9]/g,'')===compact);
      if(boundary){quantityText=quantityText.replace(sku,' ');return true;}
      return false;
    });
    quantityText=quantityText.replace(/\b(\d+)\s*x\b/g,'$1 ').replace(/\bx\s*(\d+)\b/g,' $1 ');
    const terms=tokens(quantityText),candidates=skuMatches.length?skuMatches:terms.length?rows.filter(row=>{const haystack=productWords(row);return terms.every(term=>haystack.has(term));}):[];
    if(!terms.length&&!skuMatches.length){
      if(!previous.length&&!/\d|\b(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cada|esas?|esos?|estas?|estos?|mismas?|mismos?|ambas?|ambos)\b/.test(part))continue;
      if(!previous.length){unresolved.push('Indica a qué prenda corresponde la cantidad.');continue;}
      const count=quantity(part);if(count===null)return answer('Usa una cantidad entera de 1 a 100 por prenda.');
      if(previous.length>1&&(!/cada|ambas|ambos|estas|esas|estos|esos/.test(part)||count>1&&!/cada/.test(part))){unresolved.push('Hay varias prendas en la consulta anterior. Indica el nombre de la que quieres cambiar.');continue;}
      for(const item of previous){const row=rows.find(row=>row.id===item.productId);if(!row){unresolved.push('Una prenda anterior ya no está en el catálogo activo.');continue;}const adjustment=part.match(/(?:\b(?:\d+|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(mas|menos)\b)/)?.[1];const next=adjustment==='mas'?item.quantity+count:adjustment==='menos'?item.quantity-count:count===1&&!/\b(?:un|una|uno|1)\b/.test(part)?item.quantity:count;if(next<1||next>100)return answer('Indica la nueva cantidad total de cada prenda, entre 1 y 100, para volver a calcular.');selected.set(row.id,next);}
      continue;
    }
    if(!candidates.length){unresolved.push(`No identifiqué «${part}».`);continue;}
    if(candidates.length>1){ambiguous.push(...candidates);continue;}
    const count=quantity(quantityText);if(count===null)return answer('Usa una cantidad entera de 1 a 100 por prenda. Por ejemplo: «2 Camisa Lino y 1 Jeans Rectos».');
    const row=candidates[0];selected.set(row.id,(selected.get(row.id)??0)+count);
  }
  if(ambiguous.length||unresolved.length){const choices=[...new Map(ambiguous.map(row=>[row.id,row])).values()];return answer(`${unresolved.join('\n')}${choices.length?'\nEncontré varias coincidencias:\n'+hints(choices):''}\nDime el nombre completo o SKU de cada prenda y su cantidad. Aún no sumo un total para evitar incluir una prenda equivocada.`,choices.slice(0,5),choices.slice(0,5).map(row=>({productId:row.id,quantity:1})));}
  if(!selected.size)return answer('Sí, puedo calcularlo. Dime las prendas y cantidades, por ejemplo: «2 Camiseta Esencial y 1 Jeans Rectos». También puedes preguntar «¿Cuál es la prenda más barata?» o «¿Cuál es la más cara?».');
  if(selected.size>20||[...selected.values()].some(n=>n>100))return answer('Puedo estimar hasta 20 prendas distintas, con cantidades de 1 a 100 por prenda. Divide la consulta en grupos más pequeños.');
  const lines=[...selected].map(([id,count])=>({row:rows.find(row=>row.id===id)!,count}));
  const total=lines.reduce((sum,line)=>sum+cents(line.row)*line.count,0);
  if(!Number.isSafeInteger(total))return answer('El importe es demasiado grande para estimarlo con seguridad. Reduce las cantidades.');
  const comparison=/diferencia/.test(q)&&lines.length===2?`\nDiferencia entre precios unitarios: ${money(Math.abs(cents(lines[0].row)-cents(lines[1].row)))}.`:'';
  return answer(`Con los precios actuales del catálogo:\n${lines.map(({row,count})=>`${count} × ${row.name} (${row.sku}) · ${money(cents(row))} c/u = ${money(cents(row)*count)}`).join('\n')}\nTotal estimado: ${money(total)}.${comparison}\nEstimación de las prendas en MXN, sin añadir envío ni descuentos no confirmados. No reserva existencias ni crea una compra.`,lines.map(line=>line.row),lines.map(({row,count})=>({productId:row.id,quantity:count})));
}

export async function answerShoppingQuestion(question:string,context:Context={}):Promise<ChatAnswer|null> {
  const q=normalize(question);if(context.selectedProductId&&!extreme(q)&&!/(?:\b\d+\b|\b(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b)/.test(q))return null;if(context.selectedProductId&&/disponibilidad|talla|color|material|informacion/.test(q)&&!/(?:\b\d+\b|\bdos\b|\btres\b)/.test(q))return null;if(/cuanto (?:tiempo|tarda|demora)|horario|lavar|cuidados/.test(q))return null;if(!priceIntent(q)&&!((context.selectedProductId||context.previousSelection?.length)&&/\b(?:\d+|dos|tres|cuatro|cinco|seis|cada)\b/.test(q)))return null;
  const mode=extreme(q),filter:Record<string,unknown>={companyId:demoScope.companyId,status:'ACTIVE'};
  if(mode){
    const ceiling=priceCeiling(q);if(ceiling)filter.price=ceiling.strict?{$lt:ceiling.amount}:{$lte:ceiling.amount};
    const audiences=['Mujer','Hombre','Unisex'].filter(a=>new RegExp('\\b'+a.toLowerCase()+'\\b').test(q));
    if(audiences.length===1)filter['apparel.audience']=audiences[0];
    const kinds=[['camiseta','tee'],['camisa','shirt'],['jeans','jeans'],['pantalon','trousers'],['falda','skirt'],['vestido','dress'],['blazer','blazer'],['chaqueta','jacket'],['abrigo','coat'],['bolso','bag'],['gorra','cap'],['bufanda','scarf']].filter(([word])=>words(q).includes(word));
    if(kinds.length===1)filter['apparel.garment']=kinds[0][1];
  }
  const products=await getProductModel().find(filter).select('_id name sku price apparel.color apparel.audience apparel.garment updatedAt').sort(mode==='max'?{price:-1,_id:-1}:mode==='min'?{price:1,_id:1}:{_id:1}).limit(201).lean().exec();
  return resolveShoppingQuestion(question,products.map(row=>({...row,id:String(row._id)})),context);
}
