import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true
    },
    role: {
      type: String,
      enum: ['org_admin', 'tenant_admin', 'member'],
      required: true,
      default: 'member'
    }
  },
  {
    timestamps: true
  }
);

// Ensure a user cannot have duplicate memberships with the same scope
membershipSchema.index({ userId: 1, organizationId: 1, tenantId: 1 }, { unique: true });

export const Membership = mongoose.model('Membership', membershipSchema);
