import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenant } from '../../middleware/tenant.js';
import { pageRolesController, roleStatusController, updateRoleController, createRoleController, listRolesController, resolveRoleController } from './roleController.js';

export function createRoleRoutes(): Router {
  const router = Router();

  router.get('/', authenticate, tenant, authorize('roles.ver'), listRolesController);
  router.get('/page',authenticate,tenant,authorize('roles.ver'),pageRolesController);
  router.get('/:roleName/permissions', authenticate, tenant, authorize('roles.ver'), resolveRoleController);
  router.post('/', authenticate, tenant, authorize('roles.editar'), createRoleController);

  router.patch('/:id/status',authenticate,tenant,authorize('roles.editar'),roleStatusController);
  router.patch('/:id',authenticate,tenant,authorize('roles.editar'),updateRoleController);
  return router;
}
