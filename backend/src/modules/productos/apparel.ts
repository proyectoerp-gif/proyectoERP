import {z} from 'zod';

export const apparelSchema=z.object({
  audience:z.enum(['Mujer','Hombre','Unisex']),
  sizes:z.array(z.enum(['XS','S','M','L','XL','XXL','Única'])).min(1).max(7),
  color:z.string().trim().min(2).max(40),
  colorHex:z.string().regex(/^#[a-f0-9]{6}$/i),
  material:z.string().trim().min(2).max(100),
  description:z.string().trim().min(10).max(700),
  garment:z.enum(['tee','shirt','knit','trousers','jeans','skirt','dress','blazer','jacket','coat','bag','cap','scarf']),
}).strict();
export type Apparel=z.infer<typeof apparelSchema>;
