import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication required. Please log in.'));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return next(new UnauthorizedError('User account associated with this token no longer exists.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication session.'));
  }
};
