import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { Organization } from '../models/Organization.js';
import { Tenant } from '../models/Tenant.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new BadRequestError('An account with this email already exists'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate nice avatar placeholder based on initials
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5,7c3aed,2563eb`;

    const user = await User.create({
      name,
      email,
      passwordHash,
      avatar
    });

    const token = generateToken({ id: user._id, email: user.email });
    setTokenCookie(res, token);

    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new UnauthorizedError('Invalid email or password'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new UnauthorizedError('Invalid email or password'));
    }

    const token = generateToken({ id: user._id, email: user.email });
    setTokenCookie(res, token);

    res.json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  clearTokenCookie(res);
  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    // Fetch user's memberships populated with organization and tenant details
    const memberships = await Membership.find({ userId: user._id })
      .populate('organizationId', 'name slug')
      .populate('tenantId', 'name');

    res.json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      memberships
    });
  } catch (error) {
    next(error);
  }
};
