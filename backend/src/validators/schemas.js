import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens').optional()
  })
});

export const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional()
  })
});

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Branch name must be at least 2 characters').max(100)
  })
});

export const updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100)
  })
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    role: z.enum(['tenant_admin', 'member'], { errorMap: () => ({ message: 'Role must be tenant_admin or member' }) })
  })
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['tenant_admin', 'member', 'org_admin'], { errorMap: () => ({ message: 'Invalid role' }) })
  })
});

export const createBoardSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Board name is required').max(100),
    description: z.string().max(500).optional()
  })
});

export const updateBoardSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional()
  })
});

export const createColumnSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Column name is required').max(50),
    position: z.number().int().nonnegative().optional()
  })
});

export const updateColumnSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    position: z.number().int().nonnegative().optional()
  })
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().optional(),
    columnId: z.string().min(1, 'Column ID is required'),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    assignees: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    dueDate: z.string().nullable().optional(),
    position: z.number().optional()
  })
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    columnId: z.string().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    assignees: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    dueDate: z.string().nullable().optional(),
    position: z.number().optional(),
    expectedVersion: z.number().int().positive().optional() // For Optimistic Concurrency Control
  })
});

export const moveTaskSchema = z.object({
  body: z.object({
    sourceColumnId: z.string(),
    targetColumnId: z.string(),
    newPosition: z.number().int().nonnegative(),
    expectedVersion: z.number().int().positive().optional()
  })
});
