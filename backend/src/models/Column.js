import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a column name'],
      trim: true,
      maxlength: [50, 'Column name cannot exceed 50 characters']
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    position: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

columnSchema.index({ boardId: 1, position: 1 });

export const Column = mongoose.model('Column', columnSchema);
