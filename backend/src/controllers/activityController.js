import { ActivityLog } from '../models/ActivityLog.js';

export const getTenantActivity = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const activities = await ActivityLog.find({ tenantId })
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      status: 'success',
      activities
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardActivity = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const activities = await ActivityLog.find({ boardId, tenantId: req.tenant._id })
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      status: 'success',
      activities
    });
  } catch (error) {
    next(error);
  }
};
