import { Router } from 'express';
import {
  getTenantById,
  updateTenant
} from '../controllers/tenantController.js';
import {
  getTenantMembers,
  addTenantMember,
  updateTenantMemberRole,
  removeTenantMember
} from '../controllers/membershipController.js';
import {
  createBoard,
  getTenantBoards
} from '../controllers/boardController.js';
import { getTenantActivity } from '../controllers/activityController.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantAccess, requireRoles } from '../middleware/tenantIsolation.js';
import { validate } from '../middleware/validate.js';
import {
  updateTenantSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  createBoardSchema
} from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

// Tenant CRUD (scoped by requireTenantAccess)
router.get('/:tenantId', requireTenantAccess, getTenantById);
router.patch(
  '/:tenantId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  validate(updateTenantSchema),
  updateTenant
);

// Member management within tenant
router.get('/:tenantId/members', requireTenantAccess, getTenantMembers);
router.post(
  '/:tenantId/members',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  validate(addMemberSchema),
  addTenantMember
);
router.patch(
  '/:tenantId/members/:membershipId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  validate(updateMemberRoleSchema),
  updateTenantMemberRole
);
router.delete(
  '/:tenantId/members/:membershipId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  removeTenantMember
);

// Boards within tenant
router.get('/:tenantId/boards', requireTenantAccess, getTenantBoards);
router.post(
  '/:tenantId/boards',
  requireTenantAccess,
  validate(createBoardSchema),
  createBoard
);

// Tenant Activity
router.get('/:tenantId/activity', requireTenantAccess, getTenantActivity);

export default router;
