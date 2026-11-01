import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { logActivity } from '../services/activityService.js';

export const getTenantMembers = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Fetch members assigned to this specific tenant
    const memberships = await Membership.find({ tenantId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });

    // Also get any org_admins of this organization because they have authority
    const orgAdmins = await Membership.find({
      organizationId: req.organizationId,
      role: 'org_admin'
    }).populate('userId', 'name email avatar');

    // Combine distinct users
    const membersMap = new Map();
    memberships.forEach((m) => {
      if (m.userId) {
        membersMap.set(m.userId._id.toString(), {
          membershipId: m._id,
          user: m.userId,
          role: m.role,
          isOrgAdmin: false,
          createdAt: m.createdAt
        });
      }
    });

    orgAdmins.forEach((m) => {
      if (m.userId) {
        const id = m.userId._id.toString();
        if (!membersMap.has(id)) {
          membersMap.set(id, {
            membershipId: m._id,
            user: m.userId,
            role: 'org_admin',
            isOrgAdmin: true,
            createdAt: m.createdAt
          });
        }
      }
    });

    res.json({
      status: 'success',
      members: Array.from(membersMap.values())
    });
  } catch (error) {
    next(error);
  }
};

export const addTenantMember = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { email, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new NotFoundError(`No user found with email ${email}. They must register first.`));
    }

    // Check if membership already exists
    const existing = await Membership.findOne({
      userId: user._id,
      tenantId
    });

    if (existing) {
      return next(new BadRequestError('User is already a member of this branch'));
    }

    const membership = await Membership.create({
      userId: user._id,
      organizationId: req.organizationId,
      tenantId,
      role: role || 'member'
    });

    await logActivity({
      organizationId: req.organizationId,
      tenantId,
      actorId: req.user._id,
      action: 'MEMBER_ADDED',
      resourceType: 'member',
      resourceId: user._id,
      metadata: { addedUserEmail: user.email, addedUserName: user.name, role },
      io: req.app.get('io')
    });

    res.status(201).json({
      status: 'success',
      membership: {
        membershipId: membership._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        role: membership.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantMemberRole = async (req, res, next) => {
  try {
    const { membershipId } = req.params;
    const { role } = req.body;

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return next(new NotFoundError('Membership record not found'));
    }

    // Verify tenant belongs to user context
    if (membership.tenantId.toString() !== req.tenant._id.toString()) {
      return next(new ForbiddenError('Cannot update membership from a different branch'));
    }

    membership.role = role;
    await membership.save();

    res.json({
      status: 'success',
      membership
    });
  } catch (error) {
    next(error);
  }
};

export const removeTenantMember = async (req, res, next) => {
  try {
    const { membershipId } = req.params;

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return next(new NotFoundError('Membership record not found'));
    }

    if (membership.tenantId.toString() !== req.tenant._id.toString()) {
      return next(new ForbiddenError('Cannot delete membership from another branch'));
    }

    // Prevent removing self if it's the last admin
    if (membership.userId.toString() === req.user._id.toString() && membership.role === 'tenant_admin') {
      const otherAdmins = await Membership.countDocuments({
        tenantId: req.tenant._id,
        role: 'tenant_admin',
        _id: { $ne: membership._id }
      });
      if (otherAdmins === 0 && !req.isOrgAdmin) {
        return next(new BadRequestError('Cannot remove yourself: branch must have at least one administrator'));
      }
    }

    await Membership.findByIdAndDelete(membershipId);

    await logActivity({
      organizationId: req.organizationId,
      tenantId: req.tenant._id,
      actorId: req.user._id,
      action: 'MEMBER_REMOVED',
      resourceType: 'member',
      resourceId: membership.userId,
      metadata: { removedMembershipId: membershipId },
      io: req.app.get('io')
    });

    res.json({
      status: 'success',
      message: 'Member removed from branch successfully'
    });
  } catch (error) {
    next(error);
  }
};
