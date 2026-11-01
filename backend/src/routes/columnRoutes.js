import { Router } from 'express';
import {
  updateColumn,
  deleteColumn
} from '../controllers/columnController.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantAccess, requireRoles } from '../middleware/tenantIsolation.js';
import { validate } from '../middleware/validate.js';
import { updateColumnSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.patch(
  '/:columnId',
  requireTenantAccess,
  validate(updateColumnSchema),
  updateColumn
);

router.delete(
  '/:columnId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  deleteColumn
);

export default router;
