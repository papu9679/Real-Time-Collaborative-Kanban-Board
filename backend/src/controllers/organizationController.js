import { Organization } from '../models/Organization.js';
import { Tenant } from '../models/Tenant.js';
import { Membership } from '../models/Membership.js';
import { Board } from '../models/Board.js';
import { Column } from '../models/Column.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const createOrg = async (req, res, next) => {
  try {
    const { name } = req.body;
    let slug = req.body.slug;

    if (!slug) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      // Add random suffix to ensure uniqueness
      const exists = await Organization.findOne({ slug });
      if (exists) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }
    }

    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return next(new BadRequestError('An organization with this slug already exists. Please choose a different slug.'));
    }

    const org = await Organization.create({
      name,
      slug,
      createdBy: req.user._id
    });

    // Create the creator's membership as org_admin
    await Membership.create({
      userId: req.user._id,
      organizationId: org._id,
      tenantId: null, // Org-level role
      role: 'org_admin'
    });

    // Create default tenant (branch) for the organization
    const defaultBranch = await Tenant.create({
      name: 'Main Branch',
      organizationId: org._id
    });

    // Create default board for the branch
    const defaultBoard = await Board.create({
      name: 'General Project Board',
      description: 'Default team workspace board',
      organizationId: org._id,
      tenantId: defaultBranch._id,
      createdBy: req.user._id
    });

    // Default 5 columns
    const defaultColumns = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    await Promise.all(
      defaultColumns.map((colName, index) =>
        Column.create({
          name: colName,
          boardId: defaultBoard._id,
          tenantId: defaultBranch._id,
          position: index
        })
      )
    );

    res.status(201).json({
      status: 'success',
      organization: org,
      defaultBranch,
      defaultBoard
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrganizations = async (req, res, next) => {
  try {
    // Find all memberships of the user
    const memberships = await Membership.find({ userId: req.user._id });
    const orgIds = [...new Set(memberships.map((m) => m.organizationId.toString()))];

    const organizations = await Organization.find({ _id: { $in: orgIds } }).sort({ createdAt: -1 });

    // For each org, retrieve branches (tenants) accessible to this user
    const results = await Promise.all(
      organizations.map(async (org) => {
        const isOrgAdmin = memberships.some(
          (m) => m.organizationId.toString() === org._id.toString() && m.role === 'org_admin'
        );

        let tenants = [];
        if (isOrgAdmin) {
          tenants = await Tenant.find({ organizationId: org._id }).sort({ createdAt: 1 });
        } else {
          const userTenantIds = memberships
            .filter((m) => m.organizationId.toString() === org._id.toString() && m.tenantId)
            .map((m) => m.tenantId);
          tenants = await Tenant.find({ _id: { $in: userTenantIds } }).sort({ createdAt: 1 });
        }

        return {
          ...org.toObject(),
          isOrgAdmin,
          role: isOrgAdmin ? 'org_admin' : 'member',
          tenants
        };
      })
    );

    res.json({
      status: 'success',
      organizations: results
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgById = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const org = await Organization.findById(organizationId);
    if (!org) {
      return next(new NotFoundError('Organization not found'));
    }

    const tenants = await Tenant.find({ organizationId }).sort({ createdAt: 1 });
    const members = await Membership.find({ organizationId })
      .populate('userId', 'name email avatar')
      .populate('tenantId', 'name');

    res.json({
      status: 'success',
      organization: org,
      tenants,
      members
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrg = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const { name } = req.body;

    const org = await Organization.findByIdAndUpdate(
      organizationId,
      { ...(name && { name }) },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      organization: org
    });
  } catch (error) {
    next(error);
  }
};
