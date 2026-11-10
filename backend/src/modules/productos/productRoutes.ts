import {catalogLifecycleRoutes} from '../../core/catalogLifecycle.js';
import {apparelSchema} from './apparel.js';
import {updateApparel} from './apparelService.js';
import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {getAuditEventModel} from '../auditoria/models/AuditEvent.js';
import {maxImageDataLength,normalizeProductImage} from './productImage.js';
import {previewFashionSetup,applyFashionSetup} from '../demoSupport/fashionSetup.js';
import {env} from '../../config/env.js';
import {getProductModel} from './models/Product.js';
import { parseCatalogQuery } from '../../core/catalogPagination.js';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { logAuditEvent } from '../../audit/auditLogger.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenant } from '../../middleware/tenant.js';
import { createProduct, listProducts, pageProducts, updateProduct } from './productService.js';
const productSchema = z.object({ categoryId: z.string().trim().min(1).max(100), name: z.string().trim().min(2).max(120), sku: z.string().trim().min(1).max(48), price: z.number().finite().min(0),imageData:z.string().max(maxImageDataLength).optional() }).strict();
const productUpdateSchema = z.object({ categoryId: z.string().trim().regex(/^[a-f0-9]{24}$/i), name: z.string().trim().min(2).max(120), price: z.number().finite().min(0).refine(value => Number.isSafeInteger(Math.round(value * 100)) && value === Number(value.toFixed(2)), 'Maximum two decimals') }).strict();
const productExpectedSchema = productUpdateSchema.extend({sku:z.string().min(1).max(48)}).strict();
const guardedProductUpdateSchema = productUpdateSchema.extend({expected:productExpectedSchema.optional()}).strict();
function scope(req: Request): { companyId: string; branchId: string; userId: string } {
  const value = req.tenant;
  if (!value?.companyId || !value.branchId || !value.userId) throw new AppError({ code: 'UNAUTHORIZED', message: 'Tenant context missing', friendlyMessage: 'La sesion no tiene empresa y sucursal activas.', statusCode: 401 });
  return { companyId: value.companyId, branchId: value.branchId, userId: value.userId };
}
export function createProductRoutes(): Router {
  const router = Router();
  router.patch('/:id/apparel',authenticate,tenant,authorize('productos.editar'),async(req,res,next)=>{
    try {
      const body=z.object({apparel:apparelSchema,expected:apparelSchema.nullable()}).strict().safeParse(req.body);
      if(!body.success||!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid apparel',friendlyMessage:'Revisa colección, tallas, color, material y descripción de la prenda.'});
      res.json({ok:true,data:await updateApparel(req.params.id,scope(req),body.data.apparel,body.data.expected,req.ip)});
    } catch(error){next(error);}
  });
  router.get('/fashion-demo',authenticate,tenant,authorize('productos.editar'),authorize('roles.editar'),async(req,res,next)=>{
    try{res.set('Cache-Control','no-store').json({ok:true,data:await previewFashionSetup(scope(req),env.ERP_ENVIRONMENT)});}catch(error){next(error);}
  });
  router.post('/fashion-demo',authenticate,tenant,authorize('productos.editar'),authorize('roles.editar'),async(req,res,next)=>{
    try{
      const body=z.object({fingerprint:z.string().regex(/^[a-f0-9]{64}$/),confirmation:z.literal('ALBOR_FASHION')}).strict().safeParse(req.body);
      if(!body.success)throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid demo confirmation',friendlyMessage:'Revisa la confirmación del catálogo de moda.'});
      res.json({ok:true,data:await applyFashionSetup(scope(req),env.ERP_ENVIRONMENT,body.data.fingerprint)});
    }catch(error){next(error);}
  });
  router.get('/', authenticate, tenant, authorize('productos.ver'), async (req, res, next) => { try { const s = scope(req); res.json({ ok: true, data: await listProducts(s.companyId) }); } catch (error) { next(error); } });
  router.get('/page', authenticate, tenant, authorize('productos.ver'), async (req, res, next) => {
    try { const s = scope(req); const query = parseCatalogQuery(req.query); res.json({ ok: true, data: await pageProducts(s.companyId, query) }); } catch (error) { next(error); }
  });
  router.get('/:id/image',authenticate,tenant,authorize('productos.ver'),async(req,res,next)=>{
    try{
      const s=scope(req);
      if(!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError({code:'NOT_FOUND',statusCode:404,message:'Image not found',friendlyMessage:'Imagen no disponible.'});
      const row=await getProductModel().findOne({_id:req.params.id,companyId:s.companyId}).select('+imageData').lean();
      if(!row?.imageData)throw new AppError({code:'NOT_FOUND',statusCode:404,message:'Image not found',friendlyMessage:'Imagen no disponible.'});
      res.set('Cache-Control','private, no-store').type('image/jpeg').send(Buffer.from(row.imageData.split(',')[1],'base64'));
    }catch(error){next(error);}
  });
  router.patch('/:id/image',authenticate,tenant,authorize('productos.editar'),async(req,res,next)=>{
    try{
      const s=scope(req);
      const parsed=z.object({imageData:z.string().max(maxImageDataLength).nullable(),expectedVersion:z.string().uuid().nullable()}).strict().safeParse(req.body);
      if(!parsed.success||!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid image update',friendlyMessage:'Revisa la imagen y actualiza el producto antes de reintentar.'});
      const imageData=parsed.data.imageData===null?null:await normalizeProductImage(parsed.data.imageData);
      const imageVersion=imageData?randomUUID():null;
      await Promise.all([getProductModel().init(),getAuditEventModel().init()]);
      const session=await mongoose.startSession();
      try{
        await session.withTransaction(async()=>{
          const updated=await getProductModel().findOneAndUpdate({
            _id:req.params.id,companyId:s.companyId,imageVersion:parsed.data.expectedVersion,
          },imageData?{$set:{imageData,imageVersion}}:{$unset:{imageData:1,imageVersion:1}},{new:true,session,runValidators:true});
          if(!updated)throw new AppError({code:'CONFLICT',statusCode:409,message:'Product image changed',friendlyMessage:'La imagen cambió o el producto ya no está disponible. Actualiza el catálogo.'});
          await getAuditEventModel().create([{...s,action:'UPDATE',module:'productos',entityId:req.params.id,details:{operation:imageData?'IMAGE_UPLOAD':'IMAGE_REMOVE'}}],{session});
        });
      }finally{await session.endSession();}
      res.json({ok:true,data:{id:req.params.id,imageVersion}});
    }catch(error){next(error);}
  });
  router.post('/', authenticate, tenant, authorize('productos.editar'), async (req, res, next) => {
    try {
      const s = scope(req); const parsed = productSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid product data', friendlyMessage: 'Revisa categoria, nombre, SKU y precio del producto.', statusCode: 400 });
      const imageData=parsed.data.imageData?await normalizeProductImage(parsed.data.imageData):undefined;
      const created = await createProduct({ ...parsed.data, imageData, companyId: s.companyId });
      await logAuditEvent({ userId: s.userId, companyId: s.companyId, branchId: s.branchId, action: 'CREATE', module: 'productos', entityId: created.id, details: { sku: created.sku }, ipAddress: req.ip });
      res.status(201).json({ ok: true, data: created });
    } catch (error) { next(error); }
  });
  router.patch('/:id', authenticate, tenant, authorize('productos.editar'), async (req, res, next) => {
    try {
      const s = scope(req); const parsed = guardedProductUpdateSchema.safeParse(req.body);
      if (!parsed.success || !/^[a-f0-9]{24}$/i.test(req.params.id)) throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid product update', friendlyMessage: 'Revisa nombre, categoría y precio del producto.', statusCode: 400 });
      const updated = await updateProduct(req.params.id, { ...parsed.data, companyId: s.companyId });
      await logAuditEvent({ userId: s.userId, companyId: s.companyId, branchId: s.branchId, action: 'UPDATE', module: 'productos', entityId: updated.id, details: {}, ipAddress: req.ip });
      res.json({ ok: true, data: updated });
    } catch (error) { next(error); }
  });
  router.use(catalogLifecycleRoutes({model:getProductModel,permission:'productos.editar',module:'productos',branchScoped:false}));
  return router;
}
