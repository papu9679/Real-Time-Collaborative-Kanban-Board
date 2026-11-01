import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import { Board } from '../models/Board.js';
import { Task } from '../models/Task.js';
import { Column } from '../models/Column.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Resolves user role and access for a specific tenant.
 * - An 'org_admin' of the parent organization has full access to all its tenants.
 * - A user with explicit tenant membership has their assigned role ('tenant_admin' or 'member').
 * - Otherwise, access is strictly denied (403 Forbidden).
 */
export const requireTenantAccess = async (req, res, next) => {
  try {
    let tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

    // If tenantId is not directly in params, check if boardId, columnId, or taskId is provided
    if (!tenantId && req.params.boardId) {
      if (!mongoose.Types.ObjectId.isValid(req.params.boardId)) {
        return next(new BadRequestError('Invalid boardId'));
      }
      const board = await Board.findById(req.params.boardId);
      if (!board) return next(new NotFoundError('Board not found'));
      tenantId = board.tenantId;
      req.board = board;
    } else if (!tenantId && req.params.columnId) {
      if (!mongoose.Types.ObjectId.isValid(req.params.columnId)) {
        return next(new BadRequestError('Invalid columnId'));
      }
      const col = await Column.findById(req.params.columnId);
      if (!col) return next(new NotFoundError('Column not found'));
      tenantId = col.tenantId;
      req.column = col;
    } else if (!tenantId && req.params.taskId) {
      if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
        return next(new BadRequestError('Invalid taskId'));
      }
      const task = await Task.findById(req.params.taskId);
      if (!task) return next(new NotFoundError('Task not found'));
      tenantId = task.tenantId;
      req.task = task;
    }

    if (!tenantId) {
      return next(new BadRequestError('Tenant context is required'));
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return next(new BadRequestError('Invalid tenant ID format'));
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return next(new NotFoundError('Tenant branch not found'));
    }

    // Check membership:
    // 1. Is user an Org Admin for this tenant's parent organization?
    const orgAdminMembership = await Membership.findOne({
      userId: req.user._id,
      organizationId: tenant.organizationId,
      role: 'org_admin'
    });

    if (orgAdminMembership) {
      req.tenant = tenant;
      req.organizationId = tenant.organizationId;
      req.userRole = 'org_admin';
      req.isOrgAdmin = true;
      return next();
    }

    // 2. Does user have explicit tenant membership?
    const tenantMembership = await Membership.findOne({
      userId: req.user._id,
      tenantId: tenant._id
    });

    if (tenantMembership) {
      req.tenant = tenant;
      req.organizationId = tenant.organizationId;
      req.userRole = tenantMembership.role;
      req.isOrgAdmin = false;
      return next();
    }

    // User is neither org_admin nor a tenant member -> strict isolation boundary!
    return next(new ForbiddenError('You do not have permission to access resources in this tenant workspace'));
  } catch (error) {
    next(error);
  }
};

/**
 * Validates that the user has access to the specified organization.
 * @param {boolean} requireAdminOnly - If true, only org_admin is allowed.
 */
export const requireOrgAccess = (requireAdminOnly = false) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
      if (!organizationId) {
        return next(new BadRequestError('Organization context is required'));
      }

      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return next(new BadRequestError('Invalid organization ID format'));
      }

      const org = await Organization.findById(organizationId);
      if (!org) {
        return next(new NotFoundError('Organization not found'));
      }

      const filter = {
        userId: req.user._id,
        organizationId: org._id
      };
      if (requireAdminOnly) {
        filter.role = 'org_admin';
      }

      const membership = await Membership.findOne(filter);
      if (!membership) {
        return next(new ForbiddenError(
          requireAdminOnly
            ? 'Organization administrator access is required'
            : 'You are not a member of this organization'
        ));
      }

      req.organization = org;
      req.orgMembership = membership;
      req.isOrgAdmin = membership.role === 'org_admin';
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Restricts access to specified roles within the active tenant/org context.
 * Roles can be: 'org_admin', 'tenant_admin', 'member'
 */
export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    // Org admins inherently have access to tenant administrative and member operations
    if (req.userRole === 'org_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.userRole)) {
      return next(new ForbiddenError(`Action requires one of the following roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};
