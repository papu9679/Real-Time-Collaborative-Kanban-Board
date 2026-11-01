import { Router } from 'express';
import {
  getBoardById,
  updateBoard,
  deleteBoard
} from '../controllers/boardController.js';
import {
  createColumn
} from '../controllers/columnController.js';
import {
  createTask,
  getBoardTasks
} from '../controllers/taskController.js';
import { getBoardActivity } from '../controllers/activityController.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantAccess, requireRoles } from '../middleware/tenantIsolation.js';
import { validate } from '../middleware/validate.js';
import {
  updateBoardSchema,
  createColumnSchema,
  createTaskSchema
} from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

// Board details, updates, deletes
router.get('/:boardId', requireTenantAccess, getBoardById);
router.patch(
  '/:boardId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  validate(updateBoardSchema),
  updateBoard
);
router.delete(
  '/:boardId',
  requireTenantAccess,
  requireRoles(['org_admin', 'tenant_admin']),
  deleteBoard
);

// Columns inside board
router.post(
  '/:boardId/columns',
  requireTenantAccess,
  validate(createColumnSchema),
  createColumn
);

// Tasks inside board
router.get('/:boardId/tasks', requireTenantAccess, getBoardTasks);
router.post(
  '/:boardId/tasks',
  requireTenantAccess,
  validate(createTaskSchema),
  createTask
);

// Activity inside board
router.get('/:boardId/activity', requireTenantAccess, getBoardActivity);

export default router;
