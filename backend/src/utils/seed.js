import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import {
  User,
  Organization,
  Tenant,
  Membership,
  Board,
  Column,
  Task,
  ActivityLog
} from '../models/index.js';

dotenv.config();

export const seedDatabase = async () => {
  console.log('[Seed] Resetting and seeding database with initial demo data...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Tenant.deleteMany({}),
    Membership.deleteMany({}),
    Board.deleteMany({}),
    Column.deleteMany({}),
    Task.deleteMany({}),
    ActivityLog.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Demo Users
  const userAdmin = await User.create({
    name: 'Sarah Connor',
    email: 'admin@acme.com',
    passwordHash,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  });

  const userChennaiAdmin = await User.create({
    name: 'Rajesh Kumar',
    email: 'chennai.admin@acme.com',
    passwordHash,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  });

  const userChennaiDev = await User.create({
    name: 'Priya Sharma',
    email: 'chennai.dev@acme.com',
    passwordHash,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  });

  const userBlrAdmin = await User.create({
    name: 'Alex Vance',
    email: 'bengaluru.admin@acme.com',
    passwordHash,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  });

  const userBlrDev = await User.create({
    name: 'David Kim',
    email: 'bengaluru.dev@acme.com',
    passwordHash,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  });

  // 2. Create Organization
  const org = await Organization.create({
    name: 'Acme Technologies',
    slug: 'acme-technologies',
    createdBy: userAdmin._id
  });

  // 3. Create Org Admin Membership
  await Membership.create({
    userId: userAdmin._id,
    organizationId: org._id,
    tenantId: null,
    role: 'org_admin'
  });

  // 4. Create Tenants (Branches)
  const chennaiTenant = await Tenant.create({
    name: 'Chennai Branch',
    organizationId: org._id
  });

  const bengaluruTenant = await Tenant.create({
    name: 'Bengaluru Branch',
    organizationId: org._id
  });

  // 5. Create Tenant Memberships
  await Promise.all([
    Membership.create({
      userId: userChennaiAdmin._id,
      organizationId: org._id,
      tenantId: chennaiTenant._id,
      role: 'tenant_admin'
    }),
    Membership.create({
      userId: userChennaiDev._id,
      organizationId: org._id,
      tenantId: chennaiTenant._id,
      role: 'member'
    }),
    Membership.create({
      userId: userBlrAdmin._id,
      organizationId: org._id,
      tenantId: bengaluruTenant._id,
      role: 'tenant_admin'
    }),
    Membership.create({
      userId: userBlrDev._id,
      organizationId: org._id,
      tenantId: bengaluruTenant._id,
      role: 'member'
    })
  ]);

  // Default Column Names
  const defaultColNames = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

  // 6. Create Boards for Chennai Branch
  const chennaiDevBoard = await Board.create({
    name: 'Development Board',
    description: 'Sprint planning and core feature engineering',
    organizationId: org._id,
    tenantId: chennaiTenant._id,
    createdBy: userChennaiAdmin._id
  });

  const chennaiDevColumns = await Promise.all(
    defaultColNames.map((name, idx) =>
      Column.create({
        name,
        boardId: chennaiDevBoard._id,
        tenantId: chennaiTenant._id,
        position: idx
      })
    )
  );

  const chennaiMarketingBoard = await Board.create({
    name: 'Marketing Board',
    description: 'Campaigns, launch events, and product outreach',
    organizationId: org._id,
    tenantId: chennaiTenant._id,
    createdBy: userChennaiAdmin._id
  });

  await Promise.all(
    defaultColNames.map((name, idx) =>
      Column.create({
        name,
        boardId: chennaiMarketingBoard._id,
        tenantId: chennaiTenant._id,
        position: idx
      })
    )
  );

  // 7. Create Boards for Bengaluru Branch
  const blrEngBoard = await Board.create({
    name: 'Engineering Board',
    description: 'Infrastructure, distributed architecture, and data pipelines',
    organizationId: org._id,
    tenantId: bengaluruTenant._id,
    createdBy: userBlrAdmin._id
  });

  const blrEngColumns = await Promise.all(
    defaultColNames.map((name, idx) =>
      Column.create({
        name,
        boardId: blrEngBoard._id,
        tenantId: bengaluruTenant._id,
        position: idx
      })
    )
  );

  const blrOpsBoard = await Board.create({
    name: 'Operations Board',
    description: 'Site reliability engineering, 24/7 incident response, and SLAs',
    organizationId: org._id,
    tenantId: bengaluruTenant._id,
    createdBy: userBlrAdmin._id
  });

  await Promise.all(
    defaultColNames.map((name, idx) =>
      Column.create({
        name,
        boardId: blrOpsBoard._id,
        tenantId: bengaluruTenant._id,
        position: idx
      })
    )
  );

  // 8. Populate realistic tasks in Chennai Development Board
  const backlogCol = chennaiDevColumns[0];
  const todoCol = chennaiDevColumns[1];
  const inProgressCol = chennaiDevColumns[2];
  const reviewCol = chennaiDevColumns[3];
  const doneCol = chennaiDevColumns[4];

  const tasksData = [
    {
      title: 'Architect Tenant-Level Data Isolation Middleware',
      description: 'Implement strict Mongoose query interceptors and Express guards to ensure zero cross-tenant leakage.',
      boardId: chennaiDevBoard._id,
      columnId: inProgressCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiAdmin._id, userChennaiDev._id],
      priority: 'Critical',
      labels: ['Security', 'Backend', 'Multi-Tenant'],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiAdmin._id
    },
    {
      title: 'Real-Time WebSockets Presence Indicators',
      description: 'Stream active collaborator user avatars to top bar when viewing a board room.',
      boardId: chennaiDevBoard._id,
      columnId: inProgressCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiDev._id],
      priority: 'High',
      labels: ['Real-Time', 'Frontend'],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      position: 1,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiDev._id
    },
    {
      title: 'Drag and Drop Task Reordering (dnd-kit)',
      description: 'Ensure smooth pointer and keyboard interactions with instant optimistic UI repositioning.',
      boardId: chennaiDevBoard._id,
      columnId: todoCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiDev._id],
      priority: 'High',
      labels: ['Frontend', 'UI/UX'],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiAdmin._id
    },
    {
      title: 'Optimistic Concurrency Control (OCC) Conflict Resolution',
      description: 'Implement version checks on task updates and render conflict comparison dialog on 409 status.',
      boardId: chennaiDevBoard._id,
      columnId: reviewCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiAdmin._id],
      priority: 'Critical',
      labels: ['Backend', 'Reliability'],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiAdmin._id
    },
    {
      title: 'Undo / Redo Stack for Board Mutations',
      description: 'Enable keyboard shortcuts (Ctrl+Z / Ctrl+Y) to revert and replay recent task movements.',
      boardId: chennaiDevBoard._id,
      columnId: backlogCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiDev._id],
      priority: 'Medium',
      labels: ['Feature', 'UI/UX'],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiAdmin._id
    },
    {
      title: 'JWT Authentication & Role-Based Access Control',
      description: 'Secure cookies and header token authentication for Org Admin, Tenant Admin, and Members.',
      boardId: chennaiDevBoard._id,
      columnId: doneCol._id,
      tenantId: chennaiTenant._id,
      assignees: [userChennaiAdmin._id],
      priority: 'Critical',
      labels: ['Security', 'Auth'],
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userChennaiAdmin._id,
      updatedBy: userChennaiAdmin._id
    }
  ];

  await Task.insertMany(tasksData);

  // 9. Populate tasks in Bengaluru Engineering Board
  const blrTodoCol = blrEngColumns[1];
  const blrInProgressCol = blrEngColumns[2];
  const blrDoneCol = blrEngColumns[4];

  await Task.insertMany([
    {
      title: 'Kubernetes Cluster Provisioning for SaaS Tenants',
      description: 'Setup isolated namespaces and network policies per tenant cluster node.',
      boardId: blrEngBoard._id,
      columnId: blrInProgressCol._id,
      tenantId: bengaluruTenant._id,
      assignees: [userBlrAdmin._id, userBlrDev._id],
      priority: 'Critical',
      labels: ['DevOps', 'Infrastructure'],
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userBlrAdmin._id,
      updatedBy: userBlrAdmin._id
    },
    {
      title: 'MongoDB Replica Set High Availability Setup',
      description: 'Configure automated failover, read replicas, and backup retention policies.',
      boardId: blrEngBoard._id,
      columnId: blrTodoCol._id,
      tenantId: bengaluruTenant._id,
      assignees: [userBlrDev._id],
      priority: 'High',
      labels: ['Database', 'SRE'],
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userBlrAdmin._id,
      updatedBy: userBlrAdmin._id
    },
    {
      title: 'Audit Logging & SOC2 Compliance Pipeline',
      description: 'Store immutable activity records for tenant actions and administrative access.',
      boardId: blrEngBoard._id,
      columnId: blrDoneCol._id,
      tenantId: bengaluruTenant._id,
      assignees: [userBlrAdmin._id],
      priority: 'Medium',
      labels: ['Security', 'Compliance'],
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      position: 0,
      version: 1,
      createdBy: userBlrAdmin._id,
      updatedBy: userBlrAdmin._id
    }
  ]);

  // 10. Seed some Activity Logs
  await ActivityLog.create([
    {
      organizationId: org._id,
      tenantId: chennaiTenant._id,
      boardId: chennaiDevBoard._id,
      actorId: userChennaiAdmin._id,
      action: 'TASK_CREATED',
      resourceType: 'task',
      metadata: { taskTitle: 'Architect Tenant-Level Data Isolation Middleware', priority: 'Critical' }
    },
    {
      organizationId: org._id,
      tenantId: chennaiTenant._id,
      boardId: chennaiDevBoard._id,
      actorId: userChennaiDev._id,
      action: 'TASK_MOVED',
      resourceType: 'task',
      metadata: { taskTitle: 'JWT Authentication & Role-Based Access Control', toColumn: 'Done' }
    }
  ]);

  console.log('[Seed] Database successfully seeded with Acme Technologies, Chennai & Bengaluru branches!');

  return {
    organization: org.name,
    branches: [chennaiTenant.name, bengaluruTenant.name],
    accounts: [
      { role: 'Org Admin', email: 'admin@acme.com', password: 'password123' },
      { role: 'Chennai Tenant Admin', email: 'chennai.admin@acme.com', password: 'password123' },
      { role: 'Chennai Member', email: 'chennai.dev@acme.com', password: 'password123' },
      { role: 'Bengaluru Tenant Admin', email: 'bengaluru.admin@acme.com', password: 'password123' },
      { role: 'Bengaluru Member', email: 'bengaluru.dev@acme.com', password: 'password123' }
    ]
  };
};

// If run directly: node src/utils/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      console.log('[Seed] Complete! Exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err);
      process.exit(1);
    }
  })();
}
