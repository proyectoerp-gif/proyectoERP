import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { authorize } from './authorize.js';

export function authorizeSettlement(write: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const kind = write ? req.body?.kind : req.query.kind;
    if (kind !== 'sales' && kind !== 'purchase-orders') {
      next(new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid settlement kind', friendlyMessage: 'Selecciona venta o compra.', statusCode: 400 }));
      return;
    }
    const domain = kind === 'sales' ? 'ventas' : 'compras';
    const required = write ? [domain + '.liquidar', 'inventario.editar', 'finanzas.editar'] : [domain + '.ver'];
    const check = (index: number): void => {
      if (index === required.length) { next(); return; }
      authorize(required[index])(req, res, error => error ? next(error) : check(index + 1));
    };
    check(0);
  };
}
