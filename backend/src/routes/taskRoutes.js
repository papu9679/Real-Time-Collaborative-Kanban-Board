import { Router } from 'express';
import {
  getTaskById,
  updateTask,
  moveTask,
  deleteTask
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenantAccess } from '../middleware/tenantIsolation.js';
import { validate } from '../middleware/validate.js';
import {
  updateTaskSchema,
  moveTaskSchema
} from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/:taskId', requireTenantAccess, getTaskById);
router.patch(
  '/:taskId',
  requireTenantAccess,
  validate(updateTaskSchema),
  updateTask
);
router.post(
  '/:taskId/move',
  requireTenantAccess,
  validate(moveTaskSchema),
  moveTask
);
router.delete(
  '/:taskId',
  requireTenantAccess,
  deleteTask
);

export default router;
