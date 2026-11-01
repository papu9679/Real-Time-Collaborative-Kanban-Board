import { Router } from 'express';
import {
  createOrg,
  getUserOrganizations,
  getOrgById,
  updateOrg
} from '../controllers/organizationController.js';
import {
  createTenant,
  getOrgTenants
} from '../controllers/tenantController.js';
import { authenticate } from '../middleware/auth.js';
import { requireOrgAccess } from '../middleware/tenantIsolation.js';
import { validate } from '../middleware/validate.js';
import {
  createOrgSchema,
  updateOrgSchema,
  createTenantSchema
} from '../validators/schemas.js';

const router = Router();

// Base org operations
router.use(authenticate);

router.post('/', validate(createOrgSchema), createOrg);
router.get('/', getUserOrganizations);
router.get('/:organizationId', requireOrgAccess(false), getOrgById);
router.patch('/:organizationId', requireOrgAccess(true), validate(updateOrgSchema), updateOrg);

// Tenant routes nested under org
router.post(
  '/:organizationId/tenants',
  requireOrgAccess(true),
  validate(createTenantSchema),
  createTenant
);
router.get('/:organizationId/tenants', requireOrgAccess(false), getOrgTenants);

export default router;
