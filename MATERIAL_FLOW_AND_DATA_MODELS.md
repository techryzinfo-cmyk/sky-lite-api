# Material Flow & Data Models Architecture
**Pratham Backend - Comprehensive Reference Document**

**Last Updated:** May 1, 2026  
**Status:** Complete Analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Material Model Structure](#material-model-structure)
3. [Material Lifecycle Models](#material-lifecycle-models)
4. [Transaction Model](#transaction-model)
5. [Milestone Model](#milestone-model)
6. [Plan Folder Model (PlanFolder)](#plan-folder-model-planfolder)
7. [Material Flow Through System](#material-flow-through-system)
8. [API Routes & Endpoints](#api-routes--endpoints)
9. [Data Relationships Diagram](#data-relationships-diagram)
10. [Workflow Examples](#workflow-examples)
11. [Note on "Claudinary"](#note-on-claudinary)

---

## Executive Summary

The Pratham backend implements a comprehensive **material management system** for construction projects, with clear lifecycle tracking through:

- **Request → Purchase → Receipt → Usage** workflow
- **Real-time inventory tracking** with balance calculations
- **Transaction logging** for financial accountability
- **Milestone tracking** for project deliverables
- **Plan management** with document versioning and approval workflows

Key architectural principles:
- **Multi-tenancy**: Organization-scoped all resources
- **Audit trails**: All operations logged with user context
- **Status workflows**: Explicit states for approvals and verification
- **Real-time inventory**: Immediate balance updates on receipt/usage

---

## Material Model Structure

**File:** `src/models/Material.js`  
**Purpose:** Represents a tracked material item in a project

### Schema Definition

```javascript
{
  // Identity
  name: String (required)              // e.g., "Cement", "Steel Rebar"
  unit: String (required)              // e.g., "Bags", "kg", "Tons"
  
  // Project Context
  project: ObjectId (required, indexed)  // Reference to Project
  organization: ObjectId (required, indexed) // Multi-tenancy
  
  // Inventory Tracking
  totalReceived: Number (default: 0)   // Cumulative received qty
  totalConsumed: Number (default: 0)   // Cumulative consumed qty
  
  // Computed Virtual
  balance: Number (virtual)            // = totalReceived - totalConsumed
  
  // Audit Logs (embedded)
  logs: [
    {
      type: String (enum)              // "Request", "Received", "Used", "Purchase", "In", "Out"
      quantity: Number
      date: Date (default: now)
      note: String                     // Additional context
      updatedBy: ObjectId (ref: User)  // Who made the change
      updatedByName: String            // Denormalized for speed
    }
  ]
}
```

### Key Features

**1. Virtual Balance Calculation**
- `balance = totalReceived - totalConsumed`
- Automatically calculated on serialization
- Real-time inventory status without aggregation

**2. Log Types**
- `"Request"` - Material requested via MaterialRequest
- `"Received"` - Material receipt verified (auto-updated by MaterialReceipt creation)
- `"Used"` - Material consumed (auto-updated by MaterialUsage creation)
- `"Purchase"` - Purchase order created
- `"In"` - Manual stock increase
- `"Out"` - Manual stock decrease

**3. Denormalization Strategy**
- `updatedByName` stored in logs for offline reference
- Supports material deletion without orphaning log history

### Relationships

```
Material
  ├── Many ← MaterialRequest (items.materialId)
  ├── Many ← MaterialPurchase (items.materialId)
  ├── Many ← MaterialReceipt (items.materialId, auto-updates totalReceived)
  ├── Many ← MaterialUsage (items.materialId, auto-updates totalConsumed)
  ├── One → Project (project field)
  └── One → Organization (organization field)
```

---

## Material Lifecycle Models

### MaterialRequest Model

**File:** `src/models/MaterialRequest.js`  
**Purpose:** Track material requests from project teams

**Schema:**
```javascript
{
  project: ObjectId (required, indexed)
  organization: ObjectId (required)
  
  requestedBy: ObjectId (required, ref: User)
  requestedByName: String
  
  items: [                              // What was requested
    {
      materialId: ObjectId (required, ref: Material)
      quantity: Number (required)
      unit: String                      // Historical copy (if material deleted)
    }
  ]
  
  commonNote: String                    // Request justification/notes
  
  status: String (enum, default: "Pending")
    // "Pending" → "Approved" → "Fulfilled"
    // Alternative: "Rejected"
  
  timestamps: true                      // createdAt, updatedAt
}
```

**Workflow:**
1. Team member creates request with desired materials & quantities
2. Request persists with "Pending" status
3. Can be approved/rejected by authorized personnel
4. Fulfilled when materials received (manual tracking)

**Relationships:**
- Many requests can reference the same material
- Links project teams to procurement

---

### MaterialPurchase Model

**File:** `src/models/MaterialPurchase.js`  
**Purpose:** Track purchase orders and financial commitments

**Schema:**
```javascript
{
  project: ObjectId (required, indexed)
  organization: ObjectId (required)
  
  purchasedBy: ObjectId (required, ref: User)
  purchasedByName: String
  
  // Vendor Details
  vendorName: String (required)         // Supplier name
  poNumber: String                      // Purchase Order reference
  
  items: [
    {
      materialId: ObjectId (required, ref: Material)
      quantity: Number (required)
      unit: String                      // From Material at time of purchase
      unitPrice: Number (default: 0)
      totalPrice: Number (default: 0)   // unitPrice × quantity
    }
  ]
  
  // Financial Tracking
  grandTotal: Number (default: 0)       // Sum of all item totalPrices
  advancePayment: Number (default: 0)
  remainingBalance: Number (default: 0) // = grandTotal - advancePayment
  
  paymentStatus: String (enum, default: "Unpaid")
    // "Unpaid" → "Partial" → "Paid"
  
  status: String (enum, default: "Pending Approval")
    // "Pending Approval" → "Approved" or "Rejected"
  
  commonNote: String
  timestamps: true
}
```

**Workflow:**
1. Procurement team creates PO with vendor & item details
2. Prices calculated per item (unitPrice × qty)
3. PO waits in "Pending Approval" state
4. Admin approves → "Approved" status
5. Advance payments tracked; payment status computed
6. Links to Transaction when payment recorded

**Key Calculations:**
```
grandTotal = SUM(item.totalPrice for all items)
remainingBalance = grandTotal - advancePayment
paymentStatus = 
  if advancePayment === 0: "Unpaid"
  if advancePayment >= grandTotal: "Paid"
  else: "Partial"
```

**Relationships:**
- May link to MaterialReceipt (when goods arrive)
- May create Transaction records (payments tracked separately)

---

### MaterialReceipt Model

**File:** `src/models/MaterialReceipt.js`  
**Purpose:** Track material inbound & inventory updates

**Schema:**
```javascript
{
  project: ObjectId (required, indexed)
  organization: ObjectId (required)
  
  receivedBy: ObjectId (required, ref: User)
  receivedByName: String
  
  // Delivery Document Reference
  vendorName: String                    // Supplier (optional, can be empty)
  challanNumber: String                 // Delivery note reference
  invoiceNumber: String                 // Invoice ref for accounting
  
  items: [
    {
      materialId: ObjectId (required, ref: Material)
      quantity: Number (required)
      unit: String                      // From Material
    }
  ]
  
  commonNote: String
  
  status: String (enum, default: "Pending Verification")
    // "Pending Verification" → "Verified" or "Rejected"
  
  timestamps: true
}
```

**Side Effects on Creation:**
When receipt is created, the API automatically:
1. **Updates Material.totalReceived** for each item
2. **Adds log entry** to Material.logs with type "Received"
3. **Includes metadata** in log: vendor, challan, invoice, note

**Workflow:**
1. Site team receives delivery; creates MaterialReceipt
2. Receipt logs: vendor, challan #, invoice #, items received
3. Receipt defaults to "Verified" status (can be changed)
4. **Automatic inventory update:** Material.totalReceived incremented
5. Material.logs captures full context

**Key Design Pattern:**
- Receipt creation is **atomic**: single operation updates Material + creates log
- No separate approval needed (unlike Purchase)
- Designed for quick site-level logging

---

### MaterialUsage Model

**File:** `src/models/MaterialUsage.js`  
**Purpose:** Track material consumption on site

**Schema:**
```javascript
{
  project: ObjectId (required, indexed)
  organization: ObjectId (required)
  
  usedBy: ObjectId (required, ref: User)
  usedByName: String
  
  // Usage Context
  locationOrTask: String                // e.g., "Foundation Area", "Column C-12"
  
  items: [
    {
      materialId: ObjectId (required, ref: Material)
      quantity: Number (required)
      unit: String                      // From Material
    }
  ]
  
  commonNote: String
  
  status: String (enum, default: "Verified")
    // Can be "Pending Verification", "Verified", "Rejected"
  
  timestamps: true
}
```

**Side Effects on Creation:**
When usage is created, the API automatically:
1. **Updates Material.totalConsumed** for each item
2. **Adds log entry** to Material.logs with type "Used"
3. **Includes metadata** in log: task/location, note

**Workflow:**
1. Site team records material usage (daily, per task)
2. Specifies: items used, quantities, task/location
3. Creates MaterialUsage record
4. **Automatic inventory update:** Material.totalConsumed incremented
5. Material.balance automatically reflects: (totalReceived - totalConsumed)

**Example:**
- Material: Cement (100 bags received)
- Usage 1: Concrete mix for foundation (30 bags) → balance = 70
- Usage 2: Concrete mix for walls (20 bags) → balance = 50

---

## Transaction Model

**File:** `src/models/Transaction.js`  
**Purpose:** Track all financial transactions (payments, debit notes, etc.)

### Schema Definition

```javascript
{
  // Ownership
  project: ObjectId (required, indexed)
  organization: ObjectId (required)
  createdBy: ObjectId (required, ref: User)
  createdByName: String
  
  // Core Transaction Data
  type: String (enum, required)
    // "Incoming" - Money received
    // "Outgoing" - Money paid
    // "Debit Note" - Adjustment/correction
    // "Purchase Payment" - Explicit PO payment
  
  amount: Number (required)             // In project currency
  date: Date (required, default: now)   // When transaction occurred
  
  // Payment Details
  paymentMethod: String (enum, default: "Other")
    // "Cash", "Bank Transfer", "Cheque", "RTGS/NEFT", "UPI", "Adjustment", "Other"
  
  partyName: String (required)          // Vendor/Client/Contractor
  referenceNumber: String               // UTR, Cheque #, etc.
  
  // Categorization
  category: String                      // e.g., "RA Bill", "Material Advance", "Delay Penalty"
  description: String                   // Free-form notes
  
  // Linking
  linkedPurchase: ObjectId              // Optional ref to MaterialPurchase
    // When created from PO approval, links back
  
  timestamps: true
}
```

### Transaction Types

**1. Incoming**
- Client payment for RA (Running Account) bills
- Advance payments
- Refunds

**2. Outgoing**
- Vendor/contractor payments
- Material purchase settlements
- Sub-contractor fees
- Direct expenses

**3. Debit Note**
- Corrections/adjustments
- Penalty deductions
- Project cost changes

**4. Purchase Payment**
- Explicit payment of MaterialPurchase
- Links to specific PO

### Financial Workflow

```
Purchase Order Created (PO total: 100k, advance paid: 30k)
  ↓
Transaction 1: "Outgoing" 30k advance (partyName: Vendor, category: "Material Advance")
  ↓
Materials Received & Verified
  ↓
Transaction 2: "Outgoing" 70k balance (partyName: Vendor, referenceNumber: UTR)
  ↓
Project Completion
  ↓
Transaction 3: "Incoming" from Client (RA Bill payment)
```

### Relationships

```
Transaction
  ├── Many ← MaterialPurchase (via linkedPurchase)
  ├── One → Project (project field)
  ├── One → Organization (organization field)
  └── One → User (createdBy field)
```

### Key Use Cases

**1. Material Purchase Flow**
```
MaterialPurchase (PO)
  → API creates Transaction(s) for payments
  → linkedPurchase = PO._id
```

**2. Custom Payments**
```
Manual recording: "Paid contractor 50k via NEFT"
  → Transaction { type: "Outgoing", amount: 50k, ... }
```

**3. Reconciliation**
```
Query transactions by:
  - dateRange: project accounting
  - paymentMethod: cash vs. bank analysis
  - partyName: vendor settlement
  - category: cost breakdown
```

---

## Milestone Model

**File:** `src/models/Milestone.js`  
**Purpose:** Track project deliverables and completion status

### Schema Definition

```javascript
{
  // Identity
  name: String (required)               // e.g., "Foundation Complete"
  description: String
  
  // Schedule
  dueDate: Date
  status: String (enum, default: "Pending", indexed)
    // "Pending", "In Progress", "Completed", "On Hold"
  
  // Ownership
  project: ObjectId (required, indexed)
  organization: ObjectId (required, indexed)
  createdBy: ObjectId (required, indexed, ref: User)
  
  completedAt: Date                     // When marked complete
  
  // Tasks (nested, sub-items of milestone)
  tasks: [
    {
      title: String (required)          // e.g., "Dig foundation pit"
      description: String
      
      // Scheduling
      startDate: Date
      endDate: Date
      
      // Completion Tracking
      isCompleted: Boolean (default: false)
      completedAt: Date
      
      // Assignment
      assignedTo: ObjectId (ref: User)  // Team member
      
      // Evidence & Verification
      proofImage: {
        url: String                     // Image evidence of completion
        uploadedAt: Date
      }
      completionNote: String            // Completion details/context
      
      // Linking
      sourceSnag: ObjectId (ref: Snag)  // If resolved from a snag
    }
  ]
  
  // Audit Trail (project-level)
  auditTrail: [
    {
      user: ObjectId (ref: User)
      userName: String
      userRole: String
      action: String (enum)
        // "Create", "Update", "StatusChange", 
        // "TaskAdded", "TaskUpdated", "TaskRemoved"
      details: String                   // What changed
      timestamp: Date (default: now)
    }
  ]
  
  timestamps: true
}
```

### Milestone Status Flow

```
         ┌─────────────┐
         │   Pending   │
         └──────┬──────┘
                │ (work starts)
         ┌──────▼──────┐
         │ In Progress │
         └──────┬──────┘
                │
        ┌───────┴───────┐
        │               │
    (complete)     (pause)
        │               │
    ┌───▼─────┐    ┌────▼────┐
    │Completed│    │ On Hold  │
    └─────────┘    └────┬─────┘
                        │ (resume)
                   (In Progress)
```

### Task Completion Evidence

**Proof Requirements:**
- `proofImage.url` - Uploaded photo evidence
- `completionNote` - Text description
- `completedAt` - Timestamp

**Example:**
```
Task: "Concrete curing completed"
  - proofImage: URL to photo of cured concrete
  - completionNote: "28-day curing done, ready for next phase"
  - completedAt: 2026-05-01T14:30:00Z
```

### Snag Resolution Integration

**Pattern:**
```
Snag Created (e.g., "Plaster cracks in Room 101")
  ↓ (snagging team creates fix task)
Milestone { task { sourceSnag: snag._id } }
  ↓ (task completed with proof)
Milestone.task.isCompleted = true
Milestone.task.completedAt = timestamp
  ↓ (milestone can auto-complete if all tasks done)
Snag resolution tracked via auditTrail
```

### Relationships

```
Milestone
  ├── One → Project (project field)
  ├── One → Organization (organization field)
  ├── One → User (createdBy field)
  ├── Many ← User (tasks[].assignedTo)
  └── Many ← Snag (tasks[].sourceSnag - reverse reference)
```

### API Endpoints

- `GET /api/projects/[projectId]/milestones` - List all milestones
- `POST /api/projects/[projectId]/milestones` - Create milestone
- `PATCH /api/projects/[projectId]/milestones/[milestoneId]` - Update status/tasks
- `DELETE /api/projects/[projectId]/milestones/[milestoneId]` - Remove milestone

---

## Plan Folder Model (PlanFolder)

**File:** `src/models/PlanFolder.js`  
**Purpose:** Organize and manage project technical plans with approval workflows

### Schema Definition

```javascript
{
  // Identity
  name: String (required)               // e.g., "Architectural Plans", "MEP Drawings"
  
  // Ownership
  project: ObjectId (required, indexed) // Which project
  createdBy: ObjectId (ref: User)       // Who created folder
  
  // Documents (array of docs with approval workflow)
  documents: [
    {
      // Document Meta
      url: String                       // File storage location
      name: String                      // Display name
      mimeType: String                  // e.g., "application/pdf"
      size: Number                      // File size in bytes
      uploadedAt: Date (default: now)
      
      // Approval Status (computed or set)
      approvalStatus: String (enum, default: "Draft")
        // "Draft" - Not yet submitted
        // "Pending" - Awaiting approvers
        // "Approved" - All approvers approved
        // "Rejected" - Any approver rejected
      
      // Legacy support (single note)
      approvalNote: String (default: "")
      
      // Per-Approver Tracking
      approvals: [
        {
          user: ObjectId (required, ref: User)
          userName: String (required)
          userRole: String (default: "")
          status: String (enum: "Pending", "Approved", "Rejected")
            // default: "Pending"
          note: String (default: "")     // Approver's comment
          respondedAt: Date (default: null)
        }
      ]
    }
  ]
  
  // Document Annotations (shared, cross-document)
  annotations: [
    {
      _id: ObjectId (auto-generated)
      
      // Client-side stability
      clientId: String (required)       // For undo/redo
      documentId: String (required)     // References documents._id (as string)
      
      // Spatial Position
      x: Number (required)              // 0.0 to 1.0 (normalized)
      y: Number (required)              // 0.0 to 1.0 (normalized)
      
      // Annotation Content (one of these typically set)
      text: String (default: "")
      imageUri: String (default: "")    // Embedded image
      videoUri: String (default: "")    // Video reference
      
      // Metadata
      createdBy: ObjectId (ref: User)
      createdByName: String (default: "")
      createdAt: Date (default: now)
    }
  ]
  
  timestamps: true                      // createdAt, updatedAt
}
```

### Document Approval Workflow

**States:**

1. **Draft**
   - Initial state when document uploaded
   - No approvers assigned
   - Can be edited/replaced

2. **Pending**
   - Sent for approval via `sendForApproval` action
   - Approvals array populated
   - All approvals initially "Pending"

3. **Approved**
   - All approvers in approvals[] have status "Approved"
   - Can move to implementation

4. **Rejected**
   - Any approver status = "Rejected"
   - Document can be revised and re-submitted

**Workflow Example:**

```
1. Upload: doc.approvalStatus = "Draft"

2. Send for Approval (Admin action):
   - Sends: { docId, approverIds: [userId1, userId2] }
   - Result: 
     doc.approvalStatus = "Pending"
     doc.approvals = [
       { user: userId1, status: "Pending", ... },
       { user: userId2, status: "Pending", ... }
     ]

3. First Approver Reviews:
   - Sends: { action: "respond", docId, response: "Approved", note: "Looks good" }
   - Result: approvals[0].status = "Approved", respondedAt = now

4. Second Approver Reviews:
   - If: { response: "Approved" }
     → All approvals "Approved" 
     → doc.approvalStatus = "Approved"
   - Else: { response: "Rejected" }
     → doc.approvalStatus = "Rejected" (immediately)

5. Revert to Draft (Admin):
   - Sends: { action: "revertToDraft", docId }
   - Result: 
     doc.approvalStatus = "Draft"
     doc.approvals = [] (cleared)
     Can re-upload and re-submit
```

### Annotations System

**Purpose:** Mark up and comment on document images

**Key Features:**

1. **Normalized Coordinates**
   - x, y as 0.0-1.0 (independent of image size)
   - Allows responsive marking without pixel-based dependencies

2. **Multi-Media Support**
   - Text annotations
   - Image embedded in annotation
   - Video reference

3. **Client Stability**
   - `clientId`: Unique ID for undo/redo on frontend
   - Persists across server syncs

4. **Atomic Replacement**
   - All annotations for a document can be replaced at once
   - Prevents race conditions with concurrent edits

**Annotation Workflow:**

```
GET /api/projects/[id]/folders/[folderId]/annotations?documentId=xxx
  ← Fetch all annotations for document

PATCH /api/projects/[id]/folders/[folderId]/annotations
  Body: { documentId: "doc123", annotations: [...] }
  ← Replace all annotations for this document
  (filters out old ones, adds new)
```

**Example Annotation:**
```json
{
  "clientId": "client-123",
  "documentId": "doc-456",
  "x": 0.35,
  "y": 0.62,
  "text": "Verify dimension matches spec",
  "imageUri": "",
  "videoUri": "",
  "createdByName": "Site Engineer",
  "createdAt": "2026-05-01T10:15:00Z"
}
```

### Relationships

```
PlanFolder
  ├── One → Project (project field)
  ├── One → User (createdBy field)
  ├── Many ← User (via approvals[].user)
  └── Many ← (annotations reference documents)
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/[id]/folders` | GET | List all plan folders |
| `/api/projects/[id]/folders` | POST | Create new folder |
| `/api/projects/[id]/folders/[folderId]` | PUT | Upload document to folder |
| `/api/projects/[id]/folders/[folderId]` | PATCH | Send for approval / Respond / Revert |
| `/api/projects/[id]/folders/[folderId]/annotations` | GET | Fetch annotations |
| `/api/projects/[id]/folders/[folderId]/annotations` | PATCH | Update annotations |

---

## Material Flow Through System

### Complete Material Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     MATERIAL LIFECYCLE FLOW                      │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: PLANNING & PROCUREMENT
────────────────────────────────

Step 1: Create Material
  POST /api/projects/[id]/materials
  └─→ Material { name: "Cement", unit: "Bags", totalReceived: 0, ... }

Step 2: Request Material (optional)
  POST /api/projects/[id]/material-requests
  └─→ MaterialRequest { items: [{ materialId, qty }], status: "Pending" }
      (Can be approved or rejected by procurement)

Step 3: Create Purchase Order
  POST /api/projects/[id]/material-purchase
  Request: { items: [{ materialId, quantity, unitPrice }], vendorName, poNumber }
  └─→ MaterialPurchase { 
        status: "Pending Approval",
        grandTotal: calculated,
        paymentStatus: "Unpaid"
      }

Step 4 (optional): Record Advance Payment
  POST /api/projects/[id]/transactions
  Request: { type: "Outgoing", amount: advanceAmt, partyName: vendor, ... }
  └─→ Transaction { type: "Outgoing", ... }
      MaterialPurchase.paymentStatus updated to "Partial"


PHASE 2: DELIVERY & INVENTORY UPDATE
──────────────────────────────────────

Step 5: Receive Materials (AUTO-UPDATES INVENTORY)
  POST /api/projects/[id]/material-receipts
  Request: { items: [{ materialId, quantity }], vendorName, challanNumber, ... }
  
  Side Effects:
    1. Material.totalReceived += quantity
    2. Material.logs.push({ type: "Received", ... })
    3. Material.balance auto-computed: totalReceived - totalConsumed
  
  └─→ MaterialReceipt { status: "Verified" }
      Material { totalReceived: 100, balance: 100 }

Step 6 (optional): Record Final Payment
  POST /api/projects/[id]/transactions
  Request: { type: "Outgoing", amount: remainingBalance, ... }
  └─→ Transaction { type: "Outgoing", ... }
      MaterialPurchase.paymentStatus = "Paid"


PHASE 3: CONSUMPTION & USAGE TRACKING
──────────────────────────────────────

Step 7: Log Material Usage (AUTO-UPDATES INVENTORY)
  POST /api/projects/[id]/material-usage
  Request: { items: [{ materialId, quantity }], locationOrTask, commonNote }
  
  Side Effects:
    1. Material.totalConsumed += quantity
    2. Material.logs.push({ type: "Used", ... })
    3. Material.balance auto-updated: totalReceived - totalConsumed
  
  └─→ MaterialUsage { status: "Verified" }
      Material { totalConsumed: 30, balance: 70 }

Step 8: Repeat Usage as Needed
  └─→ Multiple MaterialUsage entries → Cumulative consumption tracking


PHASE 4: BALANCE & RECONCILIATION
──────────────────────────────────

At any time:
  GET /api/projects/[id]/materials
  └─→ [
        {
          name: "Cement",
          totalReceived: 100,
          totalConsumed: 65,
          balance: 35,           ← Current available stock
          logs: [...]            ← Full transaction history
        }
      ]

Query Examples:
  • Used 35 bags, 65 remain in stock
  • All usage recorded with timestamps and locations
  • Full audit trail for each transaction
```

### Data Flow Diagram

```
┌──────────────────┐
│   Material       │
│   (creates)      │
└────────┬─────────┘
         │
         │ 1:N reference
         ▼
┌──────────────────────────────────────────────┐
│   MaterialRequest          MaterialPurchase   │
│   (qty needed)             (qty + pricing)    │
└──────────────────────────────────────────────┘
         │                          │
         │                          │ creates optional
         │                          ▼
         │                   ┌──────────────────┐
         │                   │  Transaction     │
         │                   │  (payment tracking)
         │                   └──────────────────┘
         │
         └─────────┬──────────────────┐
                   │                  │
         ┌─────────▼──────┐  ┌────────▼────────┐
         │MaterialReceipt │  │ MaterialUsage   │
         │(qty received)  │  │ (qty consumed)  │
         └─────────┬──────┘  └────────┬────────┘
                   │                  │
                   │ AUTO-UPDATE      │ AUTO-UPDATE
                   │                  │
         ┌─────────▼──────────────────▼──────┐
         │        Material Totals             │
         │  totalReceived += X                │
         │  totalConsumed += Y                │
         │  balance = totalReceived - consumed│
         │  logs.push({...})                  │
         └──────────────────────────────────┘
```

---

## API Routes & Endpoints

### Material Management

**List all materials for a project:**
```
GET /api/projects/[projectId]/materials
Authorization: Bearer token
Response:
  [
    {
      _id: "...",
      name: "Cement",
      unit: "Bags",
      totalReceived: 100,
      totalConsumed: 65,
      balance: 35,
      logs: [...]
    }
  ]
```

**Create a new material:**
```
POST /api/projects/[projectId]/materials
Body: {
  name: "Steel Rebar",
  unit: "kg",
  initialStock: 500          // Optional
}
Response: { _id, name, unit, totalReceived: 500, ... }
```

**Record stock in/out (manual):**
```
PATCH /api/materials/[materialId]
Body: {
  type: "In" | "Out",        // Manual adjustment types
  quantity: 50,
  note: "Initial inventory"
}
Response: { updated material }
```

**Delete material:**
```
DELETE /api/materials/[materialId]
Response: { message: "Material deleted successfully" }
```

---

### Material Request Endpoints

**List material requests:**
```
GET /api/projects/[projectId]/material-requests
Response:
  [
    {
      _id: "...",
      requestedBy: { ... },
      items: [
        { materialId, quantity, unit }
      ],
      status: "Pending",
      commonNote: "..."
    }
  ]
```

**Create material request:**
```
POST /api/projects/[projectId]/material-requests
Body: {
  items: [
    { materialId: "mat123", quantity: 50 }
  ],
  commonNote: "Required for foundation work"
}
Response: { message: "...", request: {...} }
```

---

### Material Purchase Endpoints

**List purchase orders:**
```
GET /api/projects/[projectId]/material-purchase
Response:
  [
    {
      _id: "...",
      vendorName: "ABC Concrete",
      poNumber: "PO-2026-001",
      items: [ { materialId, quantity, unitPrice, totalPrice } ],
      grandTotal: 50000,
      advancePayment: 15000,
      remainingBalance: 35000,
      paymentStatus: "Partial",
      status: "Approved"
    }
  ]
```

**Create purchase order:**
```
POST /api/projects/[projectId]/material-purchase
Body: {
  vendorName: "XYZ Supplies",
  poNumber: "PO-2026-002",
  items: [
    { materialId: "mat456", quantity: 100, unitPrice: 500 }
  ],
  advancePayment: 20000,
  commonNote: "Rush order for Phase 2"
}
Response: { message: "...", purchase: {...} }
```

**Calculations on creation:**
```
For each item:
  totalPrice = unitPrice × quantity
  
grandTotal = SUM(item.totalPrice)
remainingBalance = grandTotal - advancePayment

paymentStatus logic:
  if advancePayment === 0: "Unpaid"
  else if advancePayment >= grandTotal: "Paid"
  else: "Partial"
```

---

### Material Receipt Endpoints

**List material receipts:**
```
GET /api/projects/[projectId]/material-receipts
Response:
  [
    {
      _id: "...",
      vendorName: "ABC Concrete",
      challanNumber: "CH-001",
      invoiceNumber: "INV-2026-100",
      items: [ { materialId, quantity, unit } ],
      status: "Verified"
    }
  ]
```

**Create material receipt (AUTO-UPDATES INVENTORY):**
```
POST /api/projects/[projectId]/material-receipts
Body: {
  vendorName: "ABC Concrete",
  challanNumber: "CH-002",
  invoiceNumber: "INV-2026-101",
  items: [
    { materialId: "mat123", quantity: 100 }
  ],
  commonNote: "Received with challan, verified on site"
}

Side Effects:
  1. Material[mat123].totalReceived += 100
  2. Material[mat123].logs.push({
       type: "Received",
       quantity: 100,
       note: "Direct Receipt [id] | Challan: CH-002 | Vendor: ABC Concrete | ...",
       updatedBy: req.user.id
     })
  3. Material[mat123].balance auto-recomputed

Response: { message: "...", receipt: {...} }
```

---

### Material Usage Endpoints

**List material usage logs:**
```
GET /api/projects/[projectId]/material-usage
Response:
  [
    {
      _id: "...",
      usedBy: { ... },
      locationOrTask: "Foundation excavation",
      items: [ { materialId, quantity, unit } ],
      status: "Verified"
    }
  ]
```

**Create material usage (AUTO-UPDATES INVENTORY):**
```
POST /api/projects/[projectId]/material-usage
Body: {
  locationOrTask: "Column C-12, Foundation Level",
  items: [
    { materialId: "mat123", quantity: 25 }
  ],
  commonNote: "Concrete mix for column base"
}

Side Effects:
  1. Material[mat123].totalConsumed += 25
  2. Material[mat123].logs.push({
       type: "Used",
       quantity: 25,
       note: "Direct Usage [id] | Task: Column C-12... | Note: Concrete mix for...",
       updatedBy: req.user.id
     })
  3. Material[mat123].balance auto-recomputed

Response: { message: "...", usage: {...} }
```

---

### Transaction Endpoints

**List all transactions:**
```
GET /api/projects/[projectId]/transactions
Response:
  [
    {
      _id: "...",
      type: "Outgoing",
      amount: 50000,
      date: "2026-05-01T10:30:00Z",
      paymentMethod: "Bank Transfer",
      partyName: "ABC Supplies",
      referenceNumber: "UTR-ABC123",
      category: "Material Advance",
      linkedPurchase: "po-id" | null
    }
  ]
```

**Create transaction:**
```
POST /api/projects/[projectId]/transactions
Body: {
  type: "Outgoing",                    // Required
  amount: 75000,                       // Required
  partyName: "XYZ Contractor",         // Required
  date: "2026-05-01",                  // Defaults to now
  paymentMethod: "Bank Transfer",      // Defaults to "Other"
  referenceNumber: "UTR-XYZ789",
  category: "Material Payment",
  description: "Final payment for March deliveries",
  linkedPurchase: "po-456"             // Optional
}
Response: { message: "...", transaction: {...} }
```

**Update transaction:**
```
PATCH /api/transactions/[transactionId]
Body: { category, description, ... }
Note: Cannot modify project, organization, createdBy
Response: { message: "...", transaction: {...} }
```

**Delete transaction:**
```
DELETE /api/transactions/[transactionId]
Response: { message: "Transaction deleted successfully" }
```

---

### Milestone Endpoints

**List milestones:**
```
GET /api/projects/[projectId]/milestones
Response:
  [
    {
      _id: "...",
      name: "Foundation Complete",
      description: "...",
      dueDate: "2026-06-15",
      status: "In Progress",
      tasks: [ { title, isCompleted, assignedTo, ... } ],
      auditTrail: [...]
    }
  ]
```

**Create milestone:**
```
POST /api/projects/[projectId]/milestones
Body: {
  name: "Concrete Curing Complete",
  description: "All foundations cured for 28 days",
  dueDate: "2026-06-01",
  status: "Pending",
  tasks: [
    {
      title: "Check concrete strength",
      description: "Verify 28-day strength",
      assignedTo: "user-123"
    }
  ]
}
Response: { milestone with auditTrail entry }
```

**Update milestone:**
```
PATCH /api/projects/[projectId]/milestones/[milestoneId]
Body: {
  status: "Completed",
  tasks: [ { updated tasks } ]
}
Side Effect: Audit trail entry added
Response: { updated milestone }
```

---

### Plan Folder & Document Endpoints

**List folders:**
```
GET /api/projects/[projectId]/folders
Response:
  [
    {
      _id: "...",
      name: "Architectural Plans",
      documents: [ { url, name, approvalStatus, approvals } ],
      annotations: [...]
    }
  ]
```

**Create folder:**
```
POST /api/projects/[projectId]/folders
Body: { name: "MEP Drawings" }
Side Effect: Project status "Initialized" → "Planning"
Response: { folder }
```

**Upload document to folder:**
```
PUT /api/projects/[projectId]/folders/[folderId]
Body: {
  url: "https://storage.../doc.pdf",
  name: "Structural Layout - Rev A",
  mimeType: "application/pdf",
  size: 2048576
}
Response: { folder with new document }
```

**Send document for approval:**
```
PATCH /api/projects/[projectId]/folders/[folderId]
Body: {
  action: "sendForApproval",
  docId: "doc-123",
  approverIds: ["user-1", "user-2"]
}
Side Effect:
  - doc.approvalStatus = "Pending"
  - doc.approvals = [...]
Response: { folder }
```

**Respond to approval request:**
```
PATCH /api/projects/[projectId]/folders/[folderId]
Body: {
  action: "respond",
  docId: "doc-123",
  response: "Approved" | "Rejected",
  note: "Looks good, proceed"
}
Side Effect:
  - approval.status = response
  - approval.respondedAt = now
  - If all approved: doc.approvalStatus = "Approved"
  - If any rejected: doc.approvalStatus = "Rejected" (immediately)
Response: { folder }
```

**Revert to draft:**
```
PATCH /api/projects/[projectId]/folders/[folderId]
Body: {
  action: "revertToDraft",
  docId: "doc-123"
}
Side Effect: approvalStatus = "Draft", approvals = []
Response: { folder }
```

**Fetch annotations:**
```
GET /api/projects/[projectId]/folders/[folderId]/annotations?documentId=doc-123
Response: [ { x, y, text, imageUri, videoUri, ... } ]
```

**Update annotations:**
```
PATCH /api/projects/[projectId]/folders/[folderId]/annotations
Body: {
  documentId: "doc-123",
  annotations: [
    { clientId: "c1", x: 0.3, y: 0.5, text: "Check dimension" },
    { clientId: "c2", x: 0.7, y: 0.8, imageUri: "data:image/..." }
  ]
}
Side Effect: All old annotations for doc-123 replaced atomically
Response: { saved annotations }
```

---

## Data Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA RELATIONSHIP MAP                         │
└─────────────────────────────────────────────────────────────────┘

                        PROJECT
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
      MATERIAL        MILESTONE        PLANFOLDER
    ┌─────────────┐  ┌──────────────┐  ┌───────────────┐
    │ name        │  │ name         │  │ name          │
    │ unit        │  │ dueDate      │  │ documents[]   │
    │ total*      │  │ status       │  │ annotations[] │
    │ balance(v)  │  │ tasks[]      │  └───────────────┘
    └─────────────┘  │ auditTrail[] │       │
         │           └──────────────┘       │
         │                │                  │
         │ 1:N ref   ┌────┴────┐      ┌──────▼──────┐
         ▼           │          │      │  Documents  │
    ┌────────────────────────────┐    ├─────────────┤
    │ MaterialRequest            │    │ url         │
    │ MaterialPurchase           │    │ approval    │
    │ MaterialReceipt (→auto-up) │    │ status      │
    │ MaterialUsage (→auto-up)   │    │ approvals[] │
    └────────────────────────────┘    └─────────────┘
         │                │
         │ creates        │ tracks
         ▼                ▼
    ┌─────────────────────────────┐
    │   TRANSACTION               │
    │ ├─ type (Incoming/Outgoing) │
    │ ├─ amount                   │
    │ ├─ paymentMethod            │
    │ ├─ linkedPurchase (ref)     │
    └─────────────────────────────┘


KEY PATTERNS:
═════════════

1. Auto-Update on Creation
   MaterialReceipt → Material.totalReceived += qty
   MaterialUsage → Material.totalConsumed += qty
   ✓ Atomic operations (one API call = material + log update)

2. Status Workflows
   MaterialRequest: Pending → Approved/Rejected → Fulfilled
   MaterialPurchase: Pending Approval → Approved/Rejected
   MaterialReceipt: Pending Verification → Verified/Rejected
   Document: Draft → Pending → Approved/Rejected

3. Approval Patterns
   Docs: per-approver entries, all-or-one logic
   (All "Approved" = doc approved; any "Rejected" = rejected)

4. Audit Trail
   All mutations logged with user, role, action, timestamp
   Enables compliance, debugging, and historical tracking

5. Denormalization
   - updatedByName, createdByName stored (handles deletions)
   - unit stored in request items (material can be deleted later)
   - userName, userRole stored in approvals (role changes don't affect history)
```

---

## Workflow Examples

### Example 1: Simple Material Request → Purchase → Receipt → Usage

```
DAY 1: Procurement Request
───────────────────────────
POST /api/projects/proj-1/materials
  → Create Material: Cement, Bags, totalReceived=0

POST /api/projects/proj-1/material-requests
  → Request 500 bags of Cement (Pending)


DAY 2: Purchase Order
─────────────────────
POST /api/projects/proj-1/material-purchase
  Body: {
    vendorName: "Quality Cement Co",
    items: [{ materialId: cement-id, qty: 500, unitPrice: 600 }],
    advancePayment: 150000
  }
  → PO created, status: "Pending Approval", paymentStatus: "Partial"
  → grandTotal: 300000, remainingBalance: 150000

POST /api/projects/proj-1/transactions
  → Record advance payment: 150000 (type: Outgoing)


DAY 7: Materials Arrive
────────────────────────
POST /api/projects/proj-1/material-receipts
  Body: {
    vendorName: "Quality Cement Co",
    challanNumber: "CH-2026-001",
    items: [{ materialId: cement-id, qty: 500 }]
  }
  
  ✓ Automatic Updates:
    Material.totalReceived = 500
    Material.logs.push({ type: "Received", qty: 500, ... })
    Material.balance = 500 (available)

POST /api/projects/proj-1/transactions
  → Record balance payment: 150000 (type: Outgoing)


DAY 8-30: Ongoing Usage
────────────────────────
POST /api/projects/proj-1/material-usage (Day 8)
  Body: { locationOrTask: "Foundation Concrete", items: [{...}] qty: 120 }
  ✓ Updates: totalConsumed = 120, balance = 380

POST /api/projects/proj-1/material-usage (Day 15)
  → qty: 150 used
  ✓ Updates: totalConsumed = 270, balance = 230

POST /api/projects/proj-1/material-usage (Day 30)
  → qty: 230 used
  ✓ Updates: totalConsumed = 500, balance = 0
  ✓ All cement consumed, cycle complete


Final State:
────────────
Material {
  name: "Cement",
  unit: "Bags",
  totalReceived: 500,
  totalConsumed: 500,
  balance: 0,
  logs: [
    { type: "Received", qty: 500, date: Day 7, ... },
    { type: "Used", qty: 120, date: Day 8, location: "Foundation", ... },
    { type: "Used", qty: 150, date: Day 15, location: "Walls", ... },
    { type: "Used", qty: 230, date: Day 30, location: "Finishing", ... }
  ]
}
```

### Example 2: Plan Document Approval Workflow

```
DAY 1: Upload Plan
──────────────────
POST /api/projects/proj-1/folders
  → Create: "Architectural Plans" folder

PUT /api/projects/proj-1/folders/folder-1
  → Upload: "Layout-Rev-A.pdf"
  → Document created with approvalStatus: "Draft"


DAY 2: Send for Approval
────────────────────────
PATCH /api/projects/proj-1/folders/folder-1
  Body: {
    action: "sendForApproval",
    docId: "doc-456",
    approverIds: ["pm-user", "architect-user"]
  }
  
  ✓ Updates:
    doc.approvalStatus = "Pending"
    doc.approvals = [
      { user: pm-user, status: "Pending", userName: "Project Manager", ... },
      { user: architect-user, status: "Pending", userName: "Architect", ... }
    ]


DAY 3: PM Approves
──────────────────
PATCH /api/projects/proj-1/folders/folder-1
  Body: {
    action: "respond",
    docId: "doc-456",
    response: "Approved",
    note: "Layout looks correct"
  }
  
  ✓ Updates: approvals[0].status = "Approved", respondedAt = now
  ✗ Doc still "Pending" (architect hasn't approved)


DAY 4: Architect Reviews
────────────────────────
PATCH /api/projects/proj-1/folders/folder-1
  Body: {
    action: "respond",
    docId: "doc-456",
    response: "Approved",
    note: "Complies with standards"
  }
  
  ✓ Updates: approvals[1].status = "Approved"
  ✓ All approvals "Approved" → doc.approvalStatus = "Approved"
  ✓ Document ready for implementation


Alternative Path (Rejection):
─────────────────────────────
If architect responded: { response: "Rejected", note: "Dimensions off" }
  → doc.approvalStatus = "Rejected" (IMMEDIATELY, no need for other approvers)
  → Initiator can revise and resubmit

PATCH /api/projects/proj-1/folders/folder-1
  Body: {
    action: "revertToDraft",
    docId: "doc-456"
  }
  → approvalStatus = "Draft"
  → approvals = [] (cleared)
  → Can upload revised version and re-send


Final State:
────────────
Document {
  name: "Layout-Rev-A.pdf",
  approvalStatus: "Approved",
  approvals: [
    { user: pm-user, status: "Approved", respondedAt: Day3, note: "Layout looks..." },
    { user: architect-user, status: "Approved", respondedAt: Day4, note: "Complies..." }
  ]
}
```

### Example 3: Milestone with Snag Resolution

```
DAY 1: Create Milestone
────────────────────────
POST /api/projects/proj-1/milestones
  Body: {
    name: "Plaster Complete",
    description: "All interior plasters done",
    dueDate: "2026-06-30"
  }
  
  → Milestone created, status: "Pending"


DAY 15: Work Starts
────────────────────
PATCH /api/projects/proj-1/milestones/milestone-1
  Body: { status: "In Progress" }
  → Audit entry: "Status changed to In Progress"


DAY 22: Snag Detected
──────────────────────
(Separately, snag system creates snag record)
Snag { _id: snag-1, issue: "Plaster cracks in Room 101", ... }


DAY 23: Snag Resolution Task Added
────────────────────────────────────
PATCH /api/projects/proj-1/milestones/milestone-1
  Body: {
    tasks: [
      {
        title: "Fix plaster cracks in Room 101",
        assignedTo: "site-worker",
        sourceSnag: snag-1,
        endDate: "2026-06-25"
      }
    ]
  }
  → Audit entry: "Task added"
  → Task references snag for traceability


DAY 25: Task Completed
───────────────────────
PATCH /api/projects/proj-1/milestones/milestone-1
  Body: {
    tasks: [
      {
        title: "Fix plaster cracks...",
        isCompleted: true,
        completedAt: "2026-06-25T14:00:00Z",
        proofImage: { url: "https://storage/proof.jpg" },
        completionNote: "Cracks filled, sanded, and repainted. Quality verified."
      }
    ]
  }
  → Audit entry: "Task updated - marked complete"
  → Snag resolution tracked


FINAL STATE:
────────────
Milestone {
  name: "Plaster Complete",
  status: "In Progress",  (can be updated to "Completed" when all tasks done)
  tasks: [
    {
      title: "Fix plaster cracks in Room 101",
      isCompleted: true,
      completedAt: "2026-06-25T14:00:00Z",
      proofImage: { url: "..." },
      sourceSnag: snag-1,
      completionNote: "Cracks filled, sanded, and repainted..."
    }
  ],
  auditTrail: [
    { action: "Create", ... },
    { action: "StatusChange", details: "In Progress", ... },
    { action: "TaskAdded", ... },
    { action: "TaskUpdated", details: "Task marked complete", ... }
  ]
}
```

---

## Note on "Claudinary"

### Search Results

After comprehensive search of the codebase:
- ✗ No references to "claudinary" found
- ✗ No references to "calendar" system found
- ✗ No custom scheduling/calendar configuration found
- ✓ `"scheduler"` dependency found in package.json (React rendering scheduler, not project scheduling)

### Possible References

1. **Misspelling?**
   - "Claudinary" may have been intended as another term
   - Could not find similar-sounding terms

2. **Future Feature?**
   - Not yet implemented in the codebase
   - No placeholder code or documentation

3. **External Integration?**
   - No API calls to external calendar services
   - No calendar libraries (moment.js, date-fns config) for scheduling

### Date/Time Usage in System

The system DOES use dates in these contexts:
- `startDate`, `endDate` on Project model
- `dueDate` on Milestone model
- `createdAt`, `updatedAt` timestamps (auto-managed by Mongoose)
- Transaction `date` field for financial tracking
- Approval `respondedAt` timestamps

However:
- **No calendar view system** implemented
- **No scheduling conflicts** detection
- **No recurring events** system
- **No calendar syncing** (Google Calendar, Outlook, etc.)

### Recommendation

If calendar/scheduling functionality is needed:
1. Clarify requirements (what is "claudinary"?)
2. Implement calendar visualization separately
3. Could use `startDate`/`endDate` on Milestones as base
4. Consider calendar libraries: `date-fns`, `react-big-calendar`, or `fullcalendar`

---

## Summary

The Pratham backend implements a **comprehensive construction project management system** with:

| Feature | Status | Key Model |
|---------|--------|-----------|
| Material Inventory | ✓ Complete | Material |
| Stock Tracking | ✓ Complete | Material (balance virtual) |
| Requests | ✓ Complete | MaterialRequest |
| Purchases | ✓ Complete | MaterialPurchase |
| Receipts | ✓ Complete | MaterialReceipt (auto-update) |
| Usage | ✓ Complete | MaterialUsage (auto-update) |
| Financial Transactions | ✓ Complete | Transaction |
| Project Milestones | ✓ Complete | Milestone |
| Plan Management | ✓ Complete | PlanFolder |
| Plan Approvals | ✓ Complete | PlanFolder.approvals |
| Plan Annotations | ✓ Complete | PlanFolder.annotations |
| Calendar/Scheduling | ✗ Not Found | (See Note on Claudinary) |

**Total API Endpoints:** 30+  
**Data Models:** 10 core  
**Relationships:** Multi-level with proper normalization  
**Audit Tracking:** Full trail on all mutations  
**Organization Isolation:** Complete multi-tenancy  

---

**Document Status:** Ready for implementation reference  
**Last Verified:** May 1, 2026
