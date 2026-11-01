import { Tenant } from '../models/Tenant.js';
import { Board } from '../models/Board.js';
import { Column } from '../models/Column.js';
import { Membership } from '../models/Membership.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const createTenant = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const { name } = req.body;

    const existing = await Tenant.findOne({ organizationId, name });
    if (existing) {
      return next(new BadRequestError(`A branch named "${name}" already exists in this organization.`));
    }

    const tenant = await Tenant.create({
      name,
      organizationId
    });

    // Automatically create a default board for the branch
    const defaultBoard = await Board.create({
      name: `${name} Board`,
      description: `Primary board for ${name}`,
      organizationId,
      tenantId: tenant._id,
      createdBy: req.user._id
    });

    const defaultColumns = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    await Promise.all(
      defaultColumns.map((colName, index) =>
        Column.create({
          name: colName,
          boardId: defaultBoard._id,
          tenantId: tenant._id,
          position: index
        })
      )
    );

    // If user is not already org_admin, assign them as tenant_admin
    const existingMembership = await Membership.findOne({
      userId: req.user._id,
      organizationId,
      role: 'org_admin'
    });

    if (!existingMembership) {
      await Membership.create({
        userId: req.user._id,
        organizationId,
        tenantId: tenant._id,
        role: 'tenant_admin'
      });
    }

    res.status(201).json({
      status: 'success',
      tenant,
      defaultBoard
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgTenants = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Check if user is org_admin
    const isOrgAdmin = req.isOrgAdmin;

    let tenants;
    if (isOrgAdmin) {
      tenants = await Tenant.find({ organizationId }).sort({ createdAt: 1 });
    } else {
      const userMemberships = await Membership.find({
        userId: req.user._id,
        organizationId
      });
      const tenantIds = userMemberships.map((m) => m.tenantId).filter(Boolean);
      tenants = await Tenant.find({ _id: { $in: tenantIds } }).sort({ createdAt: 1 });
    }

    res.json({
      status: 'success',
      tenants
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantById = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId).populate('organizationId', 'name slug');
    if (!tenant) {
      return next(new NotFoundError('Tenant branch not found'));
    }

    res.json({
      status: 'success',
      tenant,
      userRole: req.userRole
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { name },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      tenant
    });
  } catch (error) {
    next(error);
  }
};
