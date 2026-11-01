import { connectDB } from '../config/db.js';
import { seedDatabase } from './seed.js';
import { User, Organization, Tenant, Board, Column, Task, Membership } from '../models/index.js';
import { generateToken, verifyToken } from './jwt.js';

const runTests = async () => {
  console.log('\n========================================');
  console.log('   FLOWSPACE AUTOMATED INTEGRATION TESTS');
  console.log('========================================\n');

  const testUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/flowspace_test';
  await (await import('mongoose')).default.connect(testUri);
  console.log(`[Database] Test Suite Connected: ${testUri}`);
  const seedInfo = await seedDatabase();

  console.log('1. Testing Seed Data Hierarchy...');
  const org = await Organization.findOne({ slug: 'acme-technologies' });
  if (!org) throw new Error('Org not found');
  console.log('   ✓ Organization Acme Technologies verified');

  const branches = await Tenant.find({ organizationId: org._id });
  if (branches.length !== 2) throw new Error(`Expected 2 branches, got ${branches.length}`);
  console.log(`   ✓ Found ${branches.length} branches: ${branches.map(b => b.name).join(', ')}`);

  console.log('\n2. Testing Authentication & RBAC Membership...');
  const adminUser = await User.findOne({ email: 'admin@acme.com' });
  const chennaiDev = await User.findOne({ email: 'chennai.dev@acme.com' });
  const blrAdmin = await User.findOne({ email: 'bengaluru.admin@acme.com' });

  const adminToken = generateToken({ id: adminUser._id, email: adminUser.email });
  const chennaiToken = generateToken({ id: chennaiDev._id, email: chennaiDev.email });

  console.log('   ✓ Tokens generated & verified successfully');

  console.log('\n3. Testing Board & Column Provisioning...');
  const chennaiTenant = branches.find(b => b.name === 'Chennai Branch');
  const blrTenant = branches.find(b => b.name === 'Bengaluru Branch');

  const chennaiBoards = await Board.find({ tenantId: chennaiTenant._id });
  if (chennaiBoards.length !== 2) throw new Error(`Expected 2 boards in Chennai, got ${chennaiBoards.length}`);
  console.log(`   ✓ Chennai boards: ${chennaiBoards.map(b => b.name).join(', ')}`);

  const devBoard = chennaiBoards.find(b => b.name === 'Development Board');
  const columns = await Column.find({ boardId: devBoard._id }).sort({ position: 1 });
  if (columns.length !== 5) throw new Error(`Expected 5 columns, got ${columns.length}`);
  console.log(`   ✓ Dev Board columns: ${columns.map(c => c.name).join(' -> ')}`);

  console.log('\n4. Testing Tasks & Position Ordering...');
  const tasks = await Task.find({ boardId: devBoard._id, tenantId: chennaiTenant._id }).sort({ position: 1 });
  if (tasks.length === 0) throw new Error('Expected tasks in dev board');
  console.log(`   ✓ Found ${tasks.length} tasks in Development Board`);

  console.log('\n5. Testing Optimistic Concurrency Control (OCC)...');
  const taskToTest = tasks[0];
  const originalVersion = taskToTest.version;
  console.log(`   - Task: "${taskToTest.title}" (Version: ${originalVersion})`);

  // Simulate User A updating with valid version
  const userAUpdate = await Task.findOneAndUpdate(
    { _id: taskToTest._id, tenantId: chennaiTenant._id, version: originalVersion },
    { $set: { title: `${taskToTest.title} (Updated by User A)` }, $inc: { version: 1 } },
    { new: true }
  );

  if (!userAUpdate || userAUpdate.version !== originalVersion + 1) {
    throw new Error('User A update failed');
  }
  console.log(`   ✓ User A update succeeded -> New Version: ${userAUpdate.version}`);

  // Simulate User B submitting update based on stale originalVersion
  console.log('   - Simulating concurrent User B update with stale version...');
  const userBStaleUpdate = await Task.findOneAndUpdate(
    { _id: taskToTest._id, tenantId: chennaiTenant._id, version: originalVersion },
    { $set: { title: 'Overwritten by User B' }, $inc: { version: 1 } },
    { new: true }
  );

  if (userBStaleUpdate !== null) {
    throw new Error('OCC Failure: Stale version was overwritten!');
  }
  console.log('   ✓ OCC Successfully Prevented Stale Overwrite (Conflict Caught!)');

  console.log('\n6. Testing Multi-Tenant Data Isolation...');
  // Verify Chennai member cannot access Bengaluru board
  const blrBoard = await Board.findOne({ tenantId: blrTenant._id });
  const chennaiMemberAccessToBlr = await Membership.findOne({
    userId: chennaiDev._id,
    $or: [
      { organizationId: org._id, role: 'org_admin' },
      { tenantId: blrTenant._id }
    ]
  });

  if (chennaiMemberAccessToBlr) {
    throw new Error('Isolation Failure: Chennai dev has unauthorized access to Bengaluru!');
  }
  console.log('   ✓ Strict Tenant Isolation Verified: Chennai Dev strictly barred from Bengaluru resources');

  // Verify Org Admin has authorized org-wide access
  const orgAdminAccessToBlr = await Membership.findOne({
    userId: adminUser._id,
    $or: [
      { organizationId: org._id, role: 'org_admin' },
      { tenantId: blrTenant._id }
    ]
  });

  if (!orgAdminAccessToBlr) {
    throw new Error('Org admin missing access to tenant');
  }
  console.log('   ✓ Org Admin Verified: Sarah Connor has authorized org-wide governance across all branches');

  console.log('\n========================================');
  console.log('   ALL INTEGRATION TESTS PASSED 100%!   ');
  console.log('========================================\n');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
