import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a tenant branch name'],
      trim: true,
      maxlength: [100, 'Tenant branch name cannot exceed 100 characters']
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee branch name uniqueness per organization
tenantSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Tenant = mongoose.model('Tenant', tenantSchema);
