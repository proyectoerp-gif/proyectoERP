import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import express from 'express';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import mongoose from 'mongoose';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {createProductRoutes} from '../src/modules/productos/productRoutes.js';
import {getProductModel} from '../src/modules/productos/models/Product.js';
import {getCategoryModel} from '../src/modules/productos/models/Category.js';
import {getUserModel} from '../src/modules/usuarios/models/User.js';
import {getAuditEventModel} from '../src/modules/auditoria/models/AuditEvent.js';
import {signToken} from '../src/security/jwt.js';

const database='codex_images_'+randomUUID().replaceAll('-','');
let server:Server|undefined,base='',owned=false;
let editor='',reader='',foreign='',productId='',categoryId='',imageData='';
const companyId='image-company',branchId='image-branch';
beforeAll(async()=>{
  const uri=process.env.STOCK_TEST_MONGODB_URI;
  if(!uri||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/?(?:\?[^\s]*)?$/.test(uri))throw new Error('Explicit localhost replica required');
  await mongoose.connect(uri,{dbName:database});
  owned=mongoose.connection.db?.databaseName===database;
  if(!owned)throw new Error('Unexpected database');
  categoryId=String((await getCategoryModel().create({companyId,name:'Images',code:'IMG'}))._id);
  productId=String((await getProductModel().create({companyId,categoryId,name:'Product',sku:'IMG',price:10}))._id);
  for(const role of ['editor','reader','foreign']){
    const co=role==='foreign'?'other-company':companyId;
    const permissions=role==='reader'?['productos.ver']:['productos.ver','productos.editar'];
    const user=await getUserModel().create({companyId:co,branchId,name:role,email:role+'@example.test',passwordHash:'unused',roleId:'local',permissions});
    const token=signToken({sub:String(user._id),companyId:co,branchId,sessionVersion:0});
    if(role==='editor')editor=token;else if(role==='reader')reader=token;else foreign=token;
  }
  const image=await sharp({create:{width:20,height:20,channels:3,background:'#5b8570'}}).png().toBuffer();
  imageData='data:image/png;base64,'+image.toString('base64');
  const app=express();
  app.use(express.json({limit:'1mb'}));
  app.use('/products',createProductRoutes());
  app.use((error:any,_req:any,res:any,_next:any)=>res.status(error.statusCode??500).json({ok:false,error:{code:error.code}}));
  server=app.listen(0);
  await new Promise<void>(resolve=>server!.once('listening',resolve));
  base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
afterAll(async()=>{
  await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());
  if(owned&&mongoose.connection.db?.databaseName===database&&database.startsWith('codex_images_'))await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
function upload(token:string,body:unknown){
  return fetch(base+'/products/'+productId+'/image',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
it('saves images with tenant permissions, conflict protection and an atomic audit',async()=>{
  const body={imageData,expectedVersion:null};
  expect((await upload('',body)).status).toBe(401);
  expect((await upload(reader,body)).status).toBe(403);
  expect((await upload(foreign,body)).status).toBe(409);
  expect((await upload(editor,{...body,companyId:'other'})).status).toBe(400);
  const saved=await upload(editor,body);
  expect(saved.status).toBe(200);
  const version=(await saved.json()).data.imageVersion;
  expect(version).toMatch(/^[a-f0-9-]{36}$/);
  expect((await upload(editor,body)).status).toBe(409);
  const row=await getProductModel().findById(productId).lean();
  expect(row?.imageData).toBeUndefined();
  expect(row?.imageVersion).toBe(version);
  const headers={Authorization:'Bearer '+reader};
  const picture=await fetch(base+'/products/'+productId+'/image',{headers});
  expect(picture.status).toBe(200);
  expect(picture.headers.get('content-type')).toContain('image/jpeg');
  const metadata=await sharp(Buffer.from(await picture.arrayBuffer())).metadata();
  expect(metadata.format).toBe('jpeg');
  expect((await fetch(base+'/products/'+productId+'/image',{headers:{Authorization:'Bearer '+foreign}})).status).toBe(404);
  expect(await getAuditEventModel().countDocuments({companyId,module:'productos','details.operation':'IMAGE_UPLOAD'})).toBe(1);
  expect((await upload(editor,{imageData:null,expectedVersion:version})).status).toBe(200);
  expect((await fetch(base+'/products/'+productId+'/image',{headers})).status).toBe(404);
});
it('creates a product and image together and excludes image bytes from catalog lists',async()=>{
  const response=await fetch(base+'/products',{method:'POST',headers:{Authorization:'Bearer '+editor,'Content-Type':'application/json'},body:JSON.stringify({name:'With image',sku:'IMG2',categoryId,price:20,imageData})});
  expect(response.status).toBe(201);
  const created=(await response.json()).data;
  expect(created.imageData).toBeUndefined();
  const stored=await getProductModel().findById(created.id).select('+imageData').lean();
  expect(stored?.imageData).toMatch(/^data:image\/jpeg;base64,/);
  const page=await fetch(base+'/products/page',{headers:{Authorization:'Bearer '+reader}});
  const rows=(await page.json()).data.items;
  expect(rows.find((row:any)=>row.id===created.id).imageVersion).toBe(stored?.imageVersion);
  expect(rows.every((row:any)=>row.imageData===undefined)).toBe(true);
});
it('rolls the image back when its audit cannot be saved',async()=>{
  const audit=vi.spyOn(getAuditEventModel(),'create').mockRejectedValueOnce(new Error('Audit unavailable') as never);
  try{
    expect((await upload(editor,{imageData,expectedVersion:null})).status).toBe(500);
    const row=await getProductModel().findById(productId).select('+imageData').lean();
    expect(row?.imageData).toBeUndefined();
    expect(row?.imageVersion).toBeUndefined();
  }finally{audit.mockRestore();}
});
