/**
 * Gulf Demo Seed Script — Al-Rashidi Construction Group LLC (Dubai, UAE)
 *
 * Run: node seed-gulf-demo.js
 * Clears and re-seeds all demo data. Safe to run multiple times.
 *
 * Login Credentials (all roles, password: Demo@1234)
 * ─────────────────────────────────────────────────
 * Admin (CEO)           : khalid@alrashidi.ae
 * Project Manager       : mohammed@alrashidi.ae
 * Finance Manager       : fatima@alrashidi.ae
 * Site Engineer         : omar@alrashidi.ae
 * QA Inspector          : aisha@alrashidi.ae
 * Procurement Officer   : rashed@alrashidi.ae
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// ─── Inline Schemas (CommonJS-compatible) ────────────────────────────────────

const OrganizationSchema = new mongoose.Schema({
  name: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const RoleSchema = new mongoose.Schema({
  name: String,
  permissions: [String],
  description: String,
  isSystemRole: { type: Boolean, default: false },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  auditTrail: [Object],
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phoneNumber: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  status: { type: String, default: 'Active' },
  loginAttempts: { type: Number, default: 0 },
  auditTrail: [Object],
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  clientName: String,
  clientEmail: String,
  clientPhone: String,
  status: { type: String, default: 'Initialized' },
  priority: { type: String, default: 'Medium' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: Date,
  endDate: Date,
  needSiteSurvey: { type: Boolean, default: false },
  siteSurveyor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  budgetHistory: [Object],
  auditTrail: [Object],
}, { timestamps: true });

const MilestoneSchema = new mongoose.Schema({
  name: String,
  description: String,
  dueDate: Date,
  status: { type: String, default: 'Pending' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  tasks: [Object],
  auditTrail: [Object],
}, { timestamps: true });

const RiskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  title: String,
  category: String,
  description: String,
  impact: { type: String, default: 'Medium' },
  probability: { type: String, default: 'Medium' },
  status: { type: String, default: 'Active' },
  mitigationProgress: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  history: [Object],
  auditTrail: [Object],
}, { timestamps: true });

const IssueSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: 'Open' },
  priority: { type: String, default: 'Medium' },
  category: { type: String, default: 'Other' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  escalationLevel: { type: Number, default: 0 },
  history: [Object],
  images: [String],
}, { timestamps: true });

const SnagSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: 'Open' },
  priority: { type: String, default: 'Medium' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionDate: Date,
  resolutionDetails: String,
  history: [Object],
  images: [String],
}, { timestamps: true });

const BOQSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  groupName: String,
  itemNumber: String,
  itemDescription: String,
  unit: String,
  quantity: Number,
  unitCost: Number,
  totalCost: Number,
  remark: String,
  version: { type: Number, default: 1 },
  isLatest: { type: Boolean, default: true },
  historyId: mongoose.Schema.Types.ObjectId,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  status: { type: String, default: 'Approved' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByName: String,
  approvedAt: Date,
}, { timestamps: true });

const MaterialSchema = new mongoose.Schema({
  name: String,
  unit: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  totalReceived: { type: Number, default: 0 },
  totalConsumed: { type: Number, default: 0 },
  logs: [Object],
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  type: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  paymentMethod: String,
  partyName: String,
  referenceNumber: String,
  category: String,
  description: String,
}, { timestamps: true });

const WorkProgressSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
  milestoneName: { type: String, default: 'General' },
  description: String,
  progressPercent: Number,
  photos: [String],
  date: String,
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loggedByName: String,
}, { timestamps: true });

// ─── Models ──────────────────────────────────────────────────────────────────

const Organization = mongoose.model('Organization', OrganizationSchema);
const Role         = mongoose.model('Role', RoleSchema);
const User         = mongoose.model('User', UserSchema);
const Project      = mongoose.model('Project', ProjectSchema);
const Milestone    = mongoose.model('Milestone', MilestoneSchema);
const Risk         = mongoose.model('Risk', RiskSchema);
const Issue        = mongoose.model('Issue', IssueSchema);
const Snag         = mongoose.model('Snag', SnagSchema);
const BOQ          = mongoose.model('BOQ', BOQSchema);
const Material     = mongoose.model('Material', MaterialSchema);
const Transaction  = mongoose.model('Transaction', TransactionSchema);
const WorkProgress = mongoose.model('WorkProgress', WorkProgressSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hash = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));
const d = (offsetDays) => { const dt = new Date('2026-01-01'); dt.setDate(dt.getDate() + offsetDays); return dt; };
const dateStr = (offsetDays) => d(offsetDays).toISOString().split('T')[0];

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('\n🔌 Connected to MongoDB\n');

  // ── Wipe existing demo data ──────────────────────────────────────────────
  const existingOrg = await Organization.findOne({ name: 'Al-Rashidi Construction Group LLC' });
  if (existingOrg) {
    const orgId = existingOrg._id;
    await Promise.all([
      WorkProgress.deleteMany({ organization: orgId }),
      Transaction.deleteMany({ organization: orgId }),
      Material.deleteMany({ organization: orgId }),
      BOQ.deleteMany({}), // BOQ has no org field, delete by project below
      Snag.deleteMany({ organization: orgId }),
      Issue.deleteMany({ organization: orgId }),
      Risk.deleteMany({ organization: orgId }),
      Milestone.deleteMany({ organization: orgId }),
      Project.deleteMany({ organization: orgId }),
      User.deleteMany({ organization: orgId }),
      Role.deleteMany({ organization: orgId }),
      Organization.deleteOne({ _id: orgId }),
    ]);
    console.log('🗑  Cleared previous Gulf demo data\n');
  }

  const PASS = await hash('Demo@1234');

  // ── 1. Organization ──────────────────────────────────────────────────────
  const org = await Organization.create({
    name: 'Al-Rashidi Construction Group LLC',
    owner: new mongoose.Types.ObjectId(),
  });
  console.log('🏢 Organization:', org.name);

  // ── 2. Roles ─────────────────────────────────────────────────────────────
  const roles = await Role.insertMany([
    {
      name: 'Admin',
      description: 'Full system access — CEO / Managing Director',
      permissions: ['*'],
      isSystemRole: true,
      organization: org._id,
    },
    {
      name: 'Project Manager',
      description: 'Manages projects, milestones, risks, budget requests, and team',
      permissions: [
        'projects:read', 'projects:create', 'projects:update',
        'milestones:read', 'milestones:create', 'milestones:update', 'milestones:delete',
        'risks:read', 'risks:create', 'risks:update', 'risks:delete',
        'issues:read', 'issues:create', 'issues:update',
        'snags:read',
        'work-progress:read',
        'boq:read',
        'transactions:read',
        'materials:read',
        'material-requests:read',
        'documents:read', 'documents:upload',
        'users:read',
      ],
      organization: org._id,
    },
    {
      name: 'Finance Manager',
      description: 'Manages BOQ, budget approvals, and all financial transactions',
      permissions: [
        'projects:read',
        'boq:read', 'boq:create', 'boq:update',
        'transactions:read', 'transactions:create',
        'milestones:read',
        'risks:read',
        'documents:read',
        'users:read',
      ],
      organization: org._id,
    },
    {
      name: 'Site Engineer',
      description: 'Logs daily work progress, manages materials on site, raises snags',
      permissions: [
        'projects:read',
        'work-progress:read', 'work-progress:create',
        'milestones:read',
        'materials:read', 'materials:create', 'materials:update',
        'material-requests:read', 'material-requests:create',
        'material-receipts:read', 'material-receipts:create',
        'snags:read', 'snags:create', 'snags:update',
        'issues:read', 'issues:create',
        'documents:read', 'documents:upload',
      ],
      organization: org._id,
    },
    {
      name: 'QA Inspector',
      description: 'Performs quality inspections, manages snagging list and site issues',
      permissions: [
        'projects:read',
        'snags:read', 'snags:create', 'snags:update', 'snags:delete',
        'issues:read', 'issues:create', 'issues:update',
        'milestones:read',
        'work-progress:read',
        'documents:read',
      ],
      organization: org._id,
    },
    {
      name: 'Procurement Officer',
      description: 'Handles material procurement, purchase orders, and supplier receipts',
      permissions: [
        'projects:read',
        'materials:read', 'materials:create', 'materials:update',
        'material-requests:read', 'material-requests:create', 'material-requests:update',
        'material-purchases:read', 'material-purchases:create',
        'material-receipts:read', 'material-receipts:create',
        'boq:read',
        'documents:read',
      ],
      organization: org._id,
    },
  ]);

  const roleMap = {};
  roles.forEach(r => { roleMap[r.name] = r; });
  console.log('🎭 Roles created:', roles.map(r => r.name).join(', '));

  // ── 3. Users ─────────────────────────────────────────────────────────────
  const usersData = [
    {
      name: 'Khalid Al-Rashidi',
      email: 'khalid@alrashidi.ae',
      phoneNumber: '0501234567',
      role: roleMap['Admin']._id,
      title: 'Admin (CEO)',
    },
    {
      name: 'Mohammed Al-Qassimi',
      email: 'mohammed@alrashidi.ae',
      phoneNumber: '0502345678',
      role: roleMap['Project Manager']._id,
      title: 'Project Manager',
    },
    {
      name: 'Fatima Al-Mazroui',
      email: 'fatima@alrashidi.ae',
      phoneNumber: '0503456789',
      role: roleMap['Finance Manager']._id,
      title: 'Finance Manager',
    },
    {
      name: 'Omar Al-Shamsi',
      email: 'omar@alrashidi.ae',
      phoneNumber: '0504567890',
      role: roleMap['Site Engineer']._id,
      title: 'Site Engineer',
    },
    {
      name: 'Aisha Al-Muhairi',
      email: 'aisha@alrashidi.ae',
      phoneNumber: '0505678901',
      role: roleMap['QA Inspector']._id,
      title: 'QA Inspector',
    },
    {
      name: 'Rashed Al-Ketbi',
      email: 'rashed@alrashidi.ae',
      phoneNumber: '0506789012',
      role: roleMap['Procurement Officer']._id,
      title: 'Procurement Officer',
    },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      password: PASS,
      phoneNumber: u.phoneNumber,
      role: u.role,
      organization: org._id,
      status: 'Active',
      auditTrail: [{
        userName: 'Seed Script',
        userRole: 'System',
        action: 'Create',
        details: `Demo account created — ${u.title}`,
        timestamp: new Date(),
      }],
    });
    createdUsers.push({ ...u, _id: user._id });
  }

  const u = {};
  createdUsers.forEach(usr => { u[usr.title] = usr; });

  // Fix org owner
  org.owner = u['Admin (CEO)']._id;
  await org.save();

  console.log('👥 Users created:', createdUsers.map(u => u.name).join(', '));

  // ── 4. Projects ──────────────────────────────────────────────────────────

  // Project 1: DIFC Tower - Block A (In Progress)
  const proj1 = await Project.create({
    name: 'DIFC Tower — Block A',
    description: 'Construction of a 42-storey Grade-A commercial tower in the Dubai International Financial Centre (DIFC). Includes basement parking, premium lobby, and rooftop facilities.',
    clientName: 'Emirates NBD Properties',
    clientEmail: 'projects@emiratesnbd.ae',
    clientPhone: '0042124567890',
    status: 'In Progress',
    priority: 'High',
    organization: org._id,
    createdBy: u['Admin (CEO)']._id,
    updatedBy: u['Project Manager']._id,
    members: createdUsers.map(cu => cu._id),
    startDate: d(-90),
    endDate: d(450),
    needSiteSurvey: true,
    siteSurveyor: u['Site Engineer']._id,
    budgetHistory: [
      {
        amount: 45000000,
        reason: 'Initial approved project budget — AED 45M',
        approvalStatus: 'Approved',
        updatedBy: u['Finance Manager']._id,
        updatedByName: 'Fatima Al-Mazroui',
        timestamp: d(-90),
      },
      {
        amount: 47500000,
        reason: 'Budget revision — additional structural steel costs due to market surge',
        approvalStatus: 'Approved',
        updatedBy: u['Finance Manager']._id,
        updatedByName: 'Fatima Al-Mazroui',
        timestamp: d(-30),
      },
    ],
    auditTrail: [
      { userName: 'Khalid Al-Rashidi', userRole: 'Admin', action: 'Create', details: 'Project created', timestamp: d(-90) },
      { userName: 'Mohammed Al-Qassimi', userRole: 'Project Manager', action: 'MemberAdded', details: 'Full project team assigned', timestamp: d(-88) },
      { userName: 'Mohammed Al-Qassimi', userRole: 'Project Manager', action: 'StatusChange', details: 'Status changed: Initialized → In Progress', timestamp: d(-60) },
    ],
  });

  // Project 2: Palm Jumeirah Villa Complex (Planning)
  const proj2 = await Project.create({
    name: 'Palm Jumeirah — Villa Complex Phase 2',
    description: 'Development of 24 luxury beachfront villas on the Palm Jumeirah. Each villa features private pool, smart home automation, and direct beach access.',
    clientName: 'Al Habtoor Group',
    clientEmail: 'development@habtoor.ae',
    clientPhone: '0042142345678',
    status: 'Planning',
    priority: 'Medium',
    organization: org._id,
    createdBy: u['Admin (CEO)']._id,
    updatedBy: u['Project Manager']._id,
    members: [
      u['Admin (CEO)']._id,
      u['Project Manager']._id,
      u['Finance Manager']._id,
      u['Site Engineer']._id,
    ],
    startDate: d(60),
    endDate: d(580),
    budgetHistory: [
      {
        amount: 28000000,
        reason: 'Initial budget approved by board — AED 28M for Phase 2',
        approvalStatus: 'Approved',
        updatedBy: u['Finance Manager']._id,
        updatedByName: 'Fatima Al-Mazroui',
        timestamp: d(-20),
      },
    ],
    auditTrail: [
      { userName: 'Khalid Al-Rashidi', userRole: 'Admin', action: 'Create', details: 'Project created — in planning phase', timestamp: d(-20) },
    ],
  });

  // Project 3: Al Maktoum Airport Terminal (Site Survey)
  const proj3 = await Project.create({
    name: 'Al Maktoum Airport — Terminal 3 Expansion',
    description: 'Expansion of Terminal 3 at Al Maktoum International Airport (DWC) to handle 15M additional passengers annually. Includes new gates, baggage handling, and transit hotel.',
    clientName: 'Dubai Airports Corporation',
    clientEmail: 'projects@dubaiairports.ae',
    clientPhone: '0042104567890',
    status: 'Site Survey',
    priority: 'Urgent',
    organization: org._id,
    createdBy: u['Admin (CEO)']._id,
    members: [
      u['Admin (CEO)']._id,
      u['Project Manager']._id,
      u['Finance Manager']._id,
      u['Site Engineer']._id,
      u['QA Inspector']._id,
    ],
    startDate: d(30),
    endDate: d(900),
    needSiteSurvey: true,
    siteSurveyor: u['Site Engineer']._id,
    budgetHistory: [
      {
        amount: 75000000,
        reason: 'Phase 1 budget allocation — AED 75M',
        approvalStatus: 'Approved',
        updatedBy: u['Finance Manager']._id,
        updatedByName: 'Fatima Al-Mazroui',
        timestamp: d(-10),
      },
    ],
    auditTrail: [
      { userName: 'Khalid Al-Rashidi', userRole: 'Admin', action: 'Create', details: 'Project created — site survey in progress', timestamp: d(-10) },
    ],
  });

  console.log('📁 Projects created: DIFC Tower, Palm Jumeirah, Al Maktoum Airport');

  // ── 5. Update users' projects array ──────────────────────────────────────
  await User.updateMany(
    { _id: { $in: createdUsers.map(u => u._id) } },
    { $set: { projects: [proj1._id, proj2._id, proj3._id] } }
  );

  // ── 6. Milestones — DIFC Tower ───────────────────────────────────────────
  const [m1, m2, m3, m4, m5] = await Milestone.insertMany([
    {
      name: 'Foundation & Piling Works',
      description: 'Complete deep pile foundation (162 piles), ground beams, and basement retaining walls',
      dueDate: d(-45),
      status: 'Completed',
      completedAt: d(-48),
      project: proj1._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Soil investigation and geotechnical report', isCompleted: true, completedAt: d(-85), assignedTo: u['Site Engineer']._id, completionNote: 'Report approved by structural consultant' },
        { title: 'Pile driving — 162 piles at 28m depth', isCompleted: true, completedAt: d(-60), assignedTo: u['Site Engineer']._id, completionNote: 'All piles load-tested and certified' },
        { title: 'Ground beam and basement slab casting', isCompleted: true, completedAt: d(-48), assignedTo: u['Site Engineer']._id, completionNote: 'Concrete strength test: 48 MPa (target 45 MPa)' },
      ],
    },
    {
      name: 'Structural Frame — Floors 1–15',
      description: 'Reinforced concrete structural frame for floors 1 to 15 including columns, beams, and slabs',
      dueDate: d(30),
      status: 'Completed',
      completedAt: d(25),
      project: proj1._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Column reinforcement and formwork — Floors 1–8', isCompleted: true, completedAt: d(-10), assignedTo: u['Site Engineer']._id },
        { title: 'Concrete pour — Floors 1–8 slabs', isCompleted: true, completedAt: d(-5), assignedTo: u['Site Engineer']._id, completionNote: '550 m³ concrete poured in 2 sessions' },
        { title: 'Column reinforcement and formwork — Floors 9–15', isCompleted: true, completedAt: d(20), assignedTo: u['Site Engineer']._id },
        { title: 'Concrete pour — Floors 9–15 slabs', isCompleted: true, completedAt: d(25), assignedTo: u['Site Engineer']._id },
      ],
    },
    {
      name: 'Structural Frame — Floors 16–30',
      description: 'Continue structural frame — columns, shear walls, and flat slabs for floors 16 to 30',
      dueDate: d(120),
      status: 'In Progress',
      project: proj1._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Shear wall formwork and rebar — Floors 16–22', isCompleted: true, completedAt: d(10), assignedTo: u['Site Engineer']._id },
        { title: 'Concrete pour — Floors 16–22', isCompleted: true, completedAt: d(18), assignedTo: u['Site Engineer']._id },
        { title: 'Shear wall formwork and rebar — Floors 23–30', isCompleted: false, assignedTo: u['Site Engineer']._id, startDate: d(1), endDate: d(45) },
        { title: 'Concrete pour — Floors 23–30', isCompleted: false, assignedTo: u['Site Engineer']._id, startDate: d(46), endDate: d(80) },
      ],
    },
    {
      name: 'MEP Rough-In (Floors 1–20)',
      description: 'Mechanical, Electrical, and Plumbing rough-in works for lower half of tower',
      dueDate: d(200),
      status: 'Pending',
      project: proj1._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'HVAC ductwork installation — Floors 1–10', isCompleted: false, startDate: d(80), endDate: d(130) },
        { title: 'Electrical conduit and cable tray — Floors 1–20', isCompleted: false, startDate: d(90), endDate: d(160) },
        { title: 'Plumbing rough-in — Floors 1–20', isCompleted: false, startDate: d(100), endDate: d(170) },
      ],
    },
    {
      name: 'Façade & Glazing Installation',
      description: 'Installation of unitised curtain wall façade and high-performance glazing system',
      dueDate: d(320),
      status: 'Pending',
      project: proj1._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Façade anchor system installation', isCompleted: false, startDate: d(150), endDate: d(200) },
        { title: 'Curtain wall panel installation', isCompleted: false, startDate: d(200), endDate: d(300) },
        { title: 'Glazing sealant and water test', isCompleted: false, startDate: d(300), endDate: d(320) },
      ],
    },
  ]);

  // Milestones — Palm Jumeirah
  await Milestone.insertMany([
    {
      name: 'Design Development & Authority Approvals',
      description: 'Finalise architectural and structural designs, obtain Dubai Municipality and DEWA approvals',
      dueDate: d(90),
      status: 'Pending',
      project: proj2._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Architectural schematic design — 24 villas', isCompleted: false, startDate: d(60), endDate: d(80) },
        { title: 'Submit DM building permit application', isCompleted: false, startDate: d(80), endDate: d(90) },
      ],
    },
    {
      name: 'Site Preparation & Infrastructure',
      description: 'Earthworks, roads, utility connections, and site hoarding',
      dueDate: d(160),
      status: 'Pending',
      project: proj2._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
    },
    {
      name: 'Villa Superstructure — Block A (Units 1–12)',
      description: 'Complete concrete structure for first 12 villas including roof slab',
      dueDate: d(300),
      status: 'Pending',
      project: proj2._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
    },
  ]);

  // Milestones — Al Maktoum Airport
  await Milestone.insertMany([
    {
      name: 'Site Survey & Topographical Mapping',
      description: 'Complete aerial drone survey and topographical mapping of 48-hectare expansion zone',
      dueDate: d(50),
      status: 'In Progress',
      project: proj3._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
      tasks: [
        { title: 'Drone survey — Zone A (24 hectares)', isCompleted: true, completedAt: d(5), assignedTo: u['Site Engineer']._id },
        { title: 'Drone survey — Zone B (24 hectares)', isCompleted: false, assignedTo: u['Site Engineer']._id, startDate: d(10), endDate: d(25) },
        { title: 'Topographical data processing and 3D model', isCompleted: false, startDate: d(25), endDate: d(45) },
      ],
    },
    {
      name: 'Preliminary Design & Feasibility',
      description: 'Concept design for terminal extension, gate pods, and airside road network',
      dueDate: d(120),
      status: 'Pending',
      project: proj3._id,
      organization: org._id,
      createdBy: u['Project Manager']._id,
    },
  ]);

  console.log('📌 Milestones created');

  // ── 7. Risks ─────────────────────────────────────────────────────────────
  await Risk.insertMany([
    // DIFC Tower risks
    {
      project: proj1._id, organization: org._id,
      title: 'Structural Steel Price Escalation',
      category: 'Financial',
      description: 'Global steel prices have increased 18% since project award. Subcontractor has submitted variation claim of AED 2.1M. Risk of further escalation due to Red Sea shipping disruptions.',
      impact: 'High', probability: 'High', status: 'Critical',
      mitigationProgress: 40,
      owner: u['Finance Manager']._id,
      history: [{ note: 'Variation claim received from Arabtec Steel. Budget revision submitted to client.', timestamp: d(-25) }],
    },
    {
      project: proj1._id, organization: org._id,
      title: 'Tower Crane Availability — Floors 23–30',
      category: 'Resources',
      description: 'Lead-time for additional tower crane (TC-2) from JASO is 14 weeks. If not secured this week, structural frame programme for upper floors will slip by 6 weeks.',
      impact: 'High', probability: 'Medium', status: 'Active',
      mitigationProgress: 60,
      owner: u['Project Manager']._id,
      history: [{ note: 'Alternative crane sourced from Al Faris — awaiting availability confirmation.', timestamp: d(-5) }],
    },
    {
      project: proj1._id, organization: org._id,
      title: 'DEWA HV Cable Routing Conflict',
      category: 'Technical',
      description: 'As-built drawings show existing DEWA 11kV cable routing conflicts with planned substation location on basement level 2. Relocation approval required from DEWA.',
      impact: 'Very High', probability: 'Low', status: 'Monitored',
      mitigationProgress: 20,
      owner: u['Site Engineer']._id,
    },
    // Palm Jumeirah risk
    {
      project: proj2._id, organization: org._id,
      title: 'DM Approval Delays — Coastal Zone Restrictions',
      category: 'Legal',
      description: 'Palm Jumeirah coastal zone regulations may require additional environmental impact assessment. Approval timeline could extend by 8–12 weeks beyond initial estimate.',
      impact: 'High', probability: 'Medium', status: 'Active',
      mitigationProgress: 10,
      owner: u['Project Manager']._id,
    },
    {
      project: proj2._id, organization: org._id,
      title: 'Subcontractor Availability — Luxury Fit-Out Trades',
      category: 'Resources',
      description: 'Specialist luxury fit-out contractors in Dubai are heavily booked. Early procurement required to secure preferred suppliers for marble, joinery, and smart home systems.',
      impact: 'Medium', probability: 'High', status: 'Active',
      mitigationProgress: 30,
      owner: u['Procurement Officer']._id,
    },
    // Al Maktoum risk
    {
      project: proj3._id, organization: org._id,
      title: 'Airside Operations Coordination — Live Runway Proximity',
      category: 'Safety',
      description: 'Expansion zone is 400m from active runway 12L/30R. All construction vehicles and cranes must comply with Dubai Airports height restrictions (max 45m AGL). Night works prohibited 23:00–06:00.',
      impact: 'Very High', probability: 'Medium', status: 'Active',
      mitigationProgress: 50,
      owner: u['Site Engineer']._id,
    },
  ]);
  console.log('⚠️  Risks created');

  // ── 8. Issues ────────────────────────────────────────────────────────────
  await Issue.insertMany([
    {
      title: 'Concrete Honeycombing — Column C-07 Floor 12',
      description: 'Post-strike inspection of column C-07 on Floor 12 reveals honeycombing extending 80mm deep over 0.4 m² area. Structural engineer assessment required before proceeding with floor 13 works.',
      status: 'In Progress', priority: 'Critical', category: 'Technical',
      project: proj1._id, organization: org._id,
      createdBy: u['QA Inspector']._id, assignedTo: u['Site Engineer']._id,
      history: [
        { action: 'Created', details: 'Defect identified during routine QA inspection', timestamp: d(-3) },
        { action: 'Assigned', details: 'Assigned to Omar Al-Shamsi for remediation planning', timestamp: d(-2) },
      ],
    },
    {
      title: 'Rebar Congestion — Core Wall Level 18',
      description: 'Rebar density at core wall junction on Level 18 is preventing proper concrete placement. Vibrator access blocked. Structural drawings need revision to allow minimum 100mm aggregate clearance.',
      status: 'Open', priority: 'High', category: 'Technical',
      project: proj1._id, organization: org._id,
      createdBy: u['Site Engineer']._id, assignedTo: u['Project Manager']._id,
      history: [
        { action: 'Created', details: 'Reported by site foreman during rebar inspection', timestamp: d(-1) },
      ],
    },
    {
      title: 'Interim Payment Certificate #4 — Delayed Approval',
      description: 'Client (Emirates NBD Properties) has not approved IPC #4 (AED 3.8M) within the 28-day contractual period. Payment is now 12 days overdue. Finance team to escalate via contract administrator.',
      status: 'Escalated', priority: 'High', category: 'Financial',
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, assignedTo: u['Project Manager']._id,
      escalationLevel: 1,
      history: [
        { action: 'Created', details: 'IPC #4 overdue by 12 days — AED 3.8M outstanding', timestamp: d(-5) },
        { action: 'Escalated', details: 'Escalated to Project Director level', timestamp: d(-2) },
      ],
    },
    {
      title: 'Authority NOC — Palm Jumeirah Boring Works',
      description: 'Dubai Municipality NOC for geotechnical boring works on Palm not yet received. Boring programme scheduled to commence in 3 weeks. Risk of programme delay if NOC delayed.',
      status: 'Open', priority: 'Medium', category: 'Third Party',
      project: proj2._id, organization: org._id,
      createdBy: u['Project Manager']._id, assignedTo: u['Project Manager']._id,
      history: [
        { action: 'Created', details: 'NOC application submitted — awaiting DM response', timestamp: d(-7) },
      ],
    },
    {
      title: 'Airport Authority — Survey Access Permit',
      description: 'Dubai Airports Corporation airside access permit for survey team not yet issued. Zone B drone survey cannot commence without approved permit. Permit application submitted 5 days ago.',
      status: 'Open', priority: 'High', category: 'Third Party',
      project: proj3._id, organization: org._id,
      createdBy: u['Site Engineer']._id, assignedTo: u['Project Manager']._id,
      history: [
        { action: 'Created', details: 'Airside permit pending — Zone B survey on hold', timestamp: d(-5) },
      ],
    },
  ]);
  console.log('🔴 Issues created');

  // ── 9. Snags ─────────────────────────────────────────────────────────────
  await Snag.insertMany([
    {
      title: 'Exposed Rebar at Slab Edge — Floor 8 North Elevation',
      description: 'Rebar protruding 35mm at slab edge along gridline A, Floor 8 north elevation. Fire protection and anti-corrosion coating required before façade works begin.',
      status: 'Open', priority: 'High',
      project: proj1._id, organization: org._id,
      createdBy: u['QA Inspector']._id, assignedTo: u['Site Engineer']._id,
    },
    {
      title: 'Formwork Residue on Column C-12 Surface',
      description: 'Column C-12, Floor 10 — significant formwork release agent residue on concrete surface. Surface must be cleaned before waterproofing application.',
      status: 'In Progress', priority: 'Medium',
      project: proj1._id, organization: org._id,
      createdBy: u['QA Inspector']._id, assignedTo: u['Site Engineer']._id,
      history: [{ action: 'Status changed to In Progress', details: 'Cleaning works commenced', timestamp: d(-1) }],
    },
    {
      title: 'Construction Joint Crack — Shear Wall SW-03',
      description: 'Hairline crack 0.3mm width running 1.2m along construction joint on shear wall SW-03, Floor 14. Structural engineer to determine if crack injection or monitoring required.',
      status: 'Open', priority: 'Critical',
      project: proj1._id, organization: org._id,
      createdBy: u['QA Inspector']._id, assignedTo: u['Project Manager']._id,
    },
    {
      title: 'Incorrect Slab Thickness — Floor 9 Zone B',
      description: 'Core sample from Floor 9 Zone B shows slab thickness of 195mm vs. specified 220mm. Area: 40 m². Structural assessment required to confirm adequacy or plan for remediation.',
      status: 'Open', priority: 'Critical',
      project: proj1._id, organization: org._id,
      createdBy: u['QA Inspector']._id, assignedTo: u['Site Engineer']._id,
    },
    {
      title: 'Misaligned Anchor Bolts — Steel Connection Floor 11',
      description: '4 out of 8 anchor bolts for steel beam connection at Grid 5/B, Floor 11 are out of tolerance by 12mm. Steel erection cannot proceed until corrective works completed.',
      status: 'Resolved', priority: 'High',
      project: proj1._id, organization: org._id,
      createdBy: u['Site Engineer']._id, assignedTo: u['Site Engineer']._id,
      resolutionDate: d(-2),
      resolutionDetails: 'Anchor bolts drilled out and re-installed using epoxy anchors. Approved by structural engineer.',
      history: [
        { action: 'Raised', details: 'Snag raised during steel erection QA check', timestamp: d(-8) },
        { action: 'Resolved', details: 'Epoxy anchor installation completed and certified', timestamp: d(-2) },
      ],
    },
  ]);
  console.log('📋 Snags created');

  // ── 10. BOQ — DIFC Tower ─────────────────────────────────────────────────
  const boqItems = [
    { groupName: 'A — Substructure', itemNumber: 'A.01', itemDescription: 'Bored Cast-in-situ Piles — 750mm dia, L=28m (162 Nos)', unit: 'No', quantity: 162, unitCost: 85000 },
    { groupName: 'A — Substructure', itemNumber: 'A.02', itemDescription: 'Pile Caps and Ground Beams — Grade 40 Concrete', unit: 'm³', quantity: 1850, unitCost: 950 },
    { groupName: 'A — Substructure', itemNumber: 'A.03', itemDescription: 'Basement Retaining Walls — 400mm RC, waterproofed', unit: 'm²', quantity: 4200, unitCost: 1800 },
    { groupName: 'B — Superstructure', itemNumber: 'B.01', itemDescription: 'Reinforced Concrete Columns — Grade 50, all floors', unit: 'm³', quantity: 3600, unitCost: 1200 },
    { groupName: 'B — Superstructure', itemNumber: 'B.02', itemDescription: 'RC Shear Walls and Core — Grade 50', unit: 'm³', quantity: 5200, unitCost: 1150 },
    { groupName: 'B — Superstructure', itemNumber: 'B.03', itemDescription: 'Post-tensioned Flat Slabs — all floors (200mm avg)', unit: 'm²', quantity: 54000, unitCost: 480 },
    { groupName: 'C — Envelope', itemNumber: 'C.01', itemDescription: 'Unitised Curtain Wall Façade — High-performance glazing', unit: 'm²', quantity: 18500, unitCost: 2800 },
    { groupName: 'C — Envelope', itemNumber: 'C.02', itemDescription: 'Roof Waterproofing and Insulation System', unit: 'm²', quantity: 1400, unitCost: 350 },
    { groupName: 'D — MEP', itemNumber: 'D.01', itemDescription: 'HVAC System — Variable Refrigerant Flow (VRF), all floors', unit: 'Sum', quantity: 1, unitCost: 4500000 },
    { groupName: 'D — MEP', itemNumber: 'D.02', itemDescription: 'High Voltage Substation and LV Distribution', unit: 'Sum', quantity: 1, unitCost: 2200000 },
  ];

  await BOQ.insertMany(boqItems.map(item => ({
    ...item,
    totalCost: item.quantity * item.unitCost,
    project: proj1._id,
    createdBy: u['Finance Manager']._id,
    createdByName: 'Fatima Al-Mazroui',
    status: 'Approved',
    approvedBy: u['Admin (CEO)']._id,
    approvedByName: 'Khalid Al-Rashidi',
    approvedAt: d(-85),
    historyId: new mongoose.Types.ObjectId(),
  })));
  console.log('💰 BOQ items created');

  // ── 11. Materials — DIFC Tower ───────────────────────────────────────────
  await Material.insertMany([
    {
      name: 'OPC Cement 53-Grade',
      unit: 'Bags (50kg)',
      project: proj1._id, organization: org._id,
      totalReceived: 48000, totalConsumed: 31500,
      logs: [
        { type: 'Received', quantity: 20000, date: d(-70), note: 'Delivery #1 — Al Ain Cement', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 15000, date: d(-60), note: 'Basement slab and ground beams', updatedByName: 'Omar Al-Shamsi' },
        { type: 'Received', quantity: 28000, date: d(-30), note: 'Delivery #2 — Al Ain Cement', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 16500, date: d(-10), note: 'Floors 1–15 structural frame', updatedByName: 'Omar Al-Shamsi' },
      ],
    },
    {
      name: 'Steel Rebar — Grade 500B',
      unit: 'Tonnes',
      project: proj1._id, organization: org._id,
      totalReceived: 2850, totalConsumed: 1920,
      logs: [
        { type: 'Received', quantity: 1200, date: d(-80), note: 'Order #1 — Emirates Steel', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 900, date: d(-65), note: 'Piles, pile caps, basement', updatedByName: 'Omar Al-Shamsi' },
        { type: 'Received', quantity: 1650, date: d(-25), note: 'Order #2 — Emirates Steel', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 1020, date: d(-5), note: 'Floors 1–15 columns and shear walls', updatedByName: 'Omar Al-Shamsi' },
      ],
    },
    {
      name: 'Ready-Mix Concrete — Grade 50',
      unit: 'm³',
      project: proj1._id, organization: org._id,
      totalReceived: 12400, totalConsumed: 9800,
      logs: [
        { type: 'Received', quantity: 5500, date: d(-75), note: 'RMC batches — UNIMIX Dubai', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 5500, date: d(-70), note: 'Substructure concrete works', updatedByName: 'Omar Al-Shamsi' },
        { type: 'Received', quantity: 6900, date: d(-20), note: 'RMC batches — UNIMIX Dubai', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 4300, date: d(-5), note: 'Floors 1–15 slabs and walls', updatedByName: 'Omar Al-Shamsi' },
      ],
    },
    {
      name: 'Plywood Formwork Panels (18mm)',
      unit: 'Sheets',
      project: proj1._id, organization: org._id,
      totalReceived: 9500, totalConsumed: 6200,
      logs: [
        { type: 'Received', quantity: 5000, date: d(-85), note: 'Formwork supply — Al Faris Equipment', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 3000, date: d(-60), note: 'Basement and foundations', updatedByName: 'Omar Al-Shamsi' },
        { type: 'Received', quantity: 4500, date: d(-35), note: 'Formwork supply — Al Faris Equipment', updatedByName: 'Rashed Al-Ketbi' },
        { type: 'Used', quantity: 3200, date: d(-10), note: 'Floors 1–15 deck formwork', updatedByName: 'Omar Al-Shamsi' },
      ],
    },
  ]);
  console.log('🔧 Materials created');

  // ── 12. Transactions — DIFC Tower ────────────────────────────────────────
  await Transaction.insertMany([
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Incoming', amount: 9000000, date: d(-85),
      paymentMethod: 'Bank Transfer',
      partyName: 'Emirates NBD Properties',
      referenceNumber: 'ENB-ADV-2025-001',
      category: 'Mobilisation Advance',
      description: 'Client mobilisation advance — 20% of contract value (AED 45M)',
    },
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Outgoing', amount: 3200000, date: d(-75),
      paymentMethod: 'Cheque',
      partyName: 'Arabtec Piling LLC',
      referenceNumber: 'CHQ-0041-2025',
      category: 'Subcontractor Payment',
      description: 'Arabtec Piling — Interim payment for piling works completion (80% milestone)',
    },
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Incoming', amount: 6750000, date: d(-45),
      paymentMethod: 'Bank Transfer',
      partyName: 'Emirates NBD Properties',
      referenceNumber: 'ENB-IPC1-2025',
      category: 'Interim Payment Certificate',
      description: 'IPC #1 — Foundation and basement works (15% of contract value)',
    },
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Purchase Payment', amount: 1850000, date: d(-30),
      paymentMethod: 'RTGS/NEFT',
      partyName: 'Emirates Steel Industries',
      referenceNumber: 'TT-ESI-2025-002',
      category: 'Material Procurement',
      description: 'Emirates Steel — Grade 500B rebar order #2 (1,650 MT)',
    },
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Incoming', amount: 6750000, date: d(-10),
      paymentMethod: 'Bank Transfer',
      partyName: 'Emirates NBD Properties',
      referenceNumber: 'ENB-IPC2-2025',
      category: 'Interim Payment Certificate',
      description: 'IPC #2 — Structural frame Floors 1–15 (15% of contract value)',
    },
    {
      project: proj1._id, organization: org._id,
      createdBy: u['Finance Manager']._id, createdByName: 'Fatima Al-Mazroui',
      type: 'Debit Note', amount: 95000, date: d(-8),
      paymentMethod: 'Adjustment',
      partyName: 'UNIMIX Ready-Mix LLC',
      referenceNumber: 'DN-UNI-2025-007',
      category: 'Quality Deduction',
      description: 'Debit note — concrete batch rejection (12 m³ below specified strength on Floor 9)',
    },
  ]);
  console.log('💳 Transactions created');

  // ── 13. Work Progress — DIFC Tower ───────────────────────────────────────
  await WorkProgress.insertMany([
    {
      project: proj1._id, organization: org._id,
      milestone: m3._id, milestoneName: 'Structural Frame — Floors 16–30',
      description: 'Completed shear wall rebar fixing on Floors 16–18. Inspection passed. Ready for formwork installation.',
      progressPercent: 25, date: dateStr(-7),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
    {
      project: proj1._id, organization: org._id,
      milestone: m3._id, milestoneName: 'Structural Frame — Floors 16–30',
      description: 'Formwork erected for Floors 16–18 shear walls. Concrete pour scheduled tomorrow pending QA sign-off.',
      progressPercent: 35, date: dateStr(-6),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
    {
      project: proj1._id, organization: org._id,
      milestone: m3._id, milestoneName: 'Structural Frame — Floors 16–30',
      description: 'Concrete pour completed — Floors 16–18 shear walls (340 m³ Grade 50). No cold joints. Slump test passed: 180mm.',
      progressPercent: 50, date: dateStr(-5),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
    {
      project: proj1._id, organization: org._id,
      milestone: m3._id, milestoneName: 'Structural Frame — Floors 16–30',
      description: 'Floors 19–22 rebar fixing in progress — 60% complete. Rebar congestion issue at SW-03 junction flagged to PM.',
      progressPercent: 60, date: dateStr(-3),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
    {
      project: proj1._id, organization: org._id,
      milestone: m3._id, milestoneName: 'Structural Frame — Floors 16–30',
      description: 'Rebar fixing Floors 19–22 completed after design clarification. Ready for inspection by QA team.',
      progressPercent: 68, date: dateStr(-1),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
    {
      project: proj1._id, organization: org._id,
      milestoneName: 'General',
      description: 'Tower crane TC-1 monthly inspection completed. All safety checks passed. Lift capacity recertified for 8-tonne loads.',
      progressPercent: 5, date: dateStr(-2),
      loggedBy: u['Site Engineer']._id, loggedByName: 'Omar Al-Shamsi',
    },
  ]);
  console.log('📊 Work progress logs created');

  // ── Done ─────────────────────────────────────────────────────────────────
  await mongoose.disconnect();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║            GULF DEMO SEED COMPLETE — Al-Rashidi Construction Group        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ROLE                  NAME                    EMAIL                     ║
║  ─────────────────────────────────────────────────────────────────────   ║
║  Admin (CEO)           Khalid Al-Rashidi        khalid@alrashidi.ae      ║
║  Project Manager       Mohammed Al-Qassimi      mohammed@alrashidi.ae    ║
║  Finance Manager       Fatima Al-Mazroui        fatima@alrashidi.ae      ║
║  Site Engineer         Omar Al-Shamsi           omar@alrashidi.ae        ║
║  QA Inspector          Aisha Al-Muhairi         aisha@alrashidi.ae       ║
║  Procurement Officer   Rashed Al-Ketbi          rashed@alrashidi.ae      ║
║                                                                          ║
║  Password (all accounts): Demo@1234                                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PROJECTS                                                                ║
║  1. DIFC Tower — Block A           (In Progress | AED 47.5M)            ║
║  2. Palm Jumeirah Villa Complex     (Planning    | AED 28M)              ║
║  3. Al Maktoum Airport Terminal 3   (Site Survey | AED 75M)              ║
╚══════════════════════════════════════════════════════════════════════════╝
`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
