import type {Apparel} from '../modules/productos/apparel.js';

const sizes:Apparel['sizes']=['XS','S','M','L','XL'];
type Design={sku:string;name:string;price:number;category:string;apparel:Apparel};
const garment=(code:string,name:string,price:number,category:string,audience:Apparel['audience'],kind:Apparel['garment'],color:string,colorHex:string,material:string,description:string,availableSizes:Apparel['sizes']=sizes):Design=>({
  sku:'ALB-MOD-'+code,name,price,category,
  apparel:{audience,garment:kind,color,colorHex,material,description,sizes:availableSizes},
});
export const fashionCategories=[
  {code:'ALB-MOD-TOP',name:'Camisetas y tops'},
  {code:'ALB-MOD-PUN',name:'Camisas y punto'},
  {code:'ALB-MOD-DEN',name:'Pantalones y denim'},
  {code:'ALB-MOD-VES',name:'Vestidos y faldas'},
  {code:'ALB-MOD-ABR',name:'Chaquetas y abrigos'},
  {code:'ALB-MOD-ACC',name:'Accesorios'},
];
export const fashionProducts:Design[]=[
  garment('001','Camiseta Esencial',349,'ALB-MOD-TOP','Unisex','tee','Marfil','#e9e2d4','Algodón','Diseño de ejemplo de corte recto, cuello redondo y manga corta.'),
  garment('002','Camiseta Boxy',399,'ALB-MOD-TOP','Unisex','tee','Negro','#30312f','Algodón','Diseño de ejemplo de silueta amplia, hombro caído y manga corta.'),
  garment('003','Top Textura',499,'ALB-MOD-TOP','Mujer','knit','Beige','#c9bca6','Punto de algodón','Diseño de ejemplo de punto sin mangas y escote redondo.'),
  garment('004','Camisa Lino',899,'ALB-MOD-PUN','Mujer','shirt','Beige','#cfbfa4','Mezcla de lino y algodón','Diseño de ejemplo de camisa holgada, cuello clásico y manga larga.'),
  garment('005','Camisa Oxford',799,'ALB-MOD-PUN','Hombre','shirt','Azul','#8ba0b5','Algodón Oxford','Diseño de ejemplo de camisa de manga larga, bolsillo frontal y cuello clásico.'),
  garment('006','Jersey Relieve',799,'ALB-MOD-PUN','Unisex','knit','Verde','#75806a','Punto de algodón','Diseño de ejemplo de jersey de manga larga y cuello redondo.'),
  garment('007','Cárdigan Suave',1099,'ALB-MOD-PUN','Mujer','knit','Rosa','#bd9990','Mezcla de punto','Diseño de ejemplo de cárdigan de manga larga con botones frontales.'),
  garment('008','Jeans Rectos',999,'ALB-MOD-DEN','Unisex','jeans','Azul','#506b86','Denim de algodón','Diseño de ejemplo de jeans de pierna recta, tiro medio y cinco bolsillos.'),
  garment('009','Pantalón Sastre',1199,'ALB-MOD-DEN','Mujer','trousers','Negro','#343635','Tejido de sastrería','Diseño de ejemplo de pantalón de tiro alto con pinzas y pierna amplia.'),
  garment('010','Pantalón Cargo',1099,'ALB-MOD-DEN','Hombre','trousers','Beige','#b4a58d','Sarga de algodón','Diseño de ejemplo de pantalón relajado con bolsillos laterales.'),
  garment('011','Falda Midi',799,'ALB-MOD-VES','Mujer','skirt','Beige','#b3a899','Tejido fluido','Diseño de ejemplo de falda de largo midi y silueta en línea A.'),
  garment('012','Vestido Camisero',1399,'ALB-MOD-VES','Mujer','dress','Marfil','#e0d6c2','Mezcla de lino y algodón','Diseño de ejemplo de vestido midi con cuello camisero y cinturón.'),
  garment('013','Vestido Línea',999,'ALB-MOD-VES','Mujer','dress','Negro','#353533','Tejido fluido','Diseño de ejemplo de vestido de tirantes, escote recto y largo midi.'),
  garment('014','Blazer Estructura',1899,'ALB-MOD-ABR','Mujer','blazer','Beige','#b7ae9d','Tejido de sastrería','Diseño de ejemplo de blazer de una botonadura y solapa clásica.'),
  garment('015','Sobrecamisa Sarga',1299,'ALB-MOD-ABR','Hombre','shirt','Verde','#727660','Sarga de algodón','Diseño de ejemplo de sobrecamisa recta con bolsillos de parche.'),
  garment('016','Chaqueta Denim',1599,'ALB-MOD-ABR','Unisex','jacket','Azul','#6d879b','Denim de algodón','Diseño de ejemplo de chaqueta corta con cuello clásico y botones.'),
  garment('017','Trench Ligero',2199,'ALB-MOD-ABR','Unisex','coat','Beige','#c4b08f','Sarga ligera','Diseño de ejemplo de gabardina de largo medio con solapas y cinturón.'),
  garment('018','Bolso Media Luna',699,'ALB-MOD-ACC','Unisex','bag','Marrón','#8d6d54','Material sintético','Diseño de ejemplo de bolso de hombro compacto con cierre superior.',['Única']),
  garment('019','Gorra Algodón',299,'ALB-MOD-ACC','Unisex','cap','Beige','#bdb49f','Algodón','Diseño de ejemplo de gorra de seis paneles con ajuste trasero.',['Única']),
  garment('020','Bufanda Canalé',449,'ALB-MOD-ACC','Unisex','scarf','Gris','#96978f','Mezcla de punto','Diseño de ejemplo de bufanda larga de punto acanalado.',['Única']),
];
