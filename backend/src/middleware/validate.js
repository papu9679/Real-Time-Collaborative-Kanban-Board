import { BadRequestError } from '../utils/errors.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parsed.success) {
      const errorMessages = parsed.error.errors.map(
        (err) => `${err.path.slice(1).join('.')}: ${err.message}`
      );
      return next(new BadRequestError(`Validation failed: ${errorMessages.join(', ')}`, parsed.error.format()));
    }

    // Replace req.body with parsed/sanitized body
    req.body = parsed.data.body || req.body;
    next();
  } catch (err) {
    next(err);
  }
};
