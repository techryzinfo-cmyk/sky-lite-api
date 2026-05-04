# Material to Milestone & Tasks Linking
**Pratham Backend - Material Usage in Project Milestones**

**Last Updated:** May 1, 2026  
**Document Version:** 1.0

---

## Executive Summary

Materials in Pratham are **indirectly linked to milestone tasks** through the **Material Usage** system. There is **no direct foreign key relationship** between Material, Milestone, or Tasks. Instead:

- **Materials are consumed/used** on specific **tasks or locations** via the `MaterialUsage.locationOrTask` field
- This field stores a **text reference** to identify which milestone task or location the material was used for
- The system tracks **inventory consumption** by project, allowing flexible task-based usage logging

**Key Principle:** Materials flow through a **lifecycle** (Request → Purchase → Receipt → Usage), and the **Usage stage** is where materials are attributed to specific tasks or locations.

---

## Material Lifecycle & Milestone Integration

### Complete Material Flow

```
┌─────────────────┐
│  Material       │
│  Created        │  name, unit, project
└────────┬────────┘
         │
         ├─────────────────────────────────────────────┐
         │                                             │
         ▼                                             │
┌─────────────────────┐                    ┌──────────┴──────────┐
│  MaterialRequest    │                    │  Manual Stock In    │
│  (Requested Qty)    │                    │  Material.logs add  │
└─────────┬───────────┘                    │  "In" entry         │
          │                                └─────────────────────┘
          ▼
┌─────────────────────┐
│  MaterialPurchase   │
│  (PO created,       │
│   Vendor assigned)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  MaterialReceipt    │
│  (Goods received)   │◄──── Auto-Updates Material.totalReceived++
│                     │
│  Material logs      │       Creates log entry type: "Received"
│  Add "Received"     │
└─────────┬───────────┘
          │
          ▼
    ┌─────────────────────────────────────┐
    │  INVENTORY NOW AVAILABLE            │
    │  Material.balance = totalReceived    │
    │                    - totalConsumed   │
    └──────┬──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  MaterialUsage                                       │
│  (Material consumed on specific TASK/LOCATION)      │
│                                                      │
│  ├─ locationOrTask: "Milestone_001-Task_1"          │
│  │                  (Links to milestone task)        │
│  ├─ items: [{materialId, quantity}]                 │
│  ├─ usedBy: User ID                                 │
│  └─ status: "Verified" | "Pending Verification"    │
│                                                      │
│  Auto-Updates:                                       │
│  • Material.totalConsumed++                          │
│  • Material.balance (recalculated)                   │
│  • Material.logs add "Used" entry                    │
└──────────────────────────────────────────────────────┘
```

---

## Data Model Relationships

### Milestone Model Structure

```javascript
{
  name: String,              // e.g., "Foundation Work"
  description: String,
  dueDate: Date,
  project: ObjectId,         // Reference to Project
  organization: ObjectId,
  status: "Pending|In Progress|Completed|On Hold",
  
  tasks: [                   // Embedded tasks array
    {
      _id: ObjectId,         // Task unique ID
      title: String,         // e.g., "Pour concrete base"
      description: String,
      isCompleted: Boolean,
      completedAt: Date,
      startDate: Date,
      endDate: Date,
      assignedTo: ObjectId,  // User reference
      proofImage: {
        url: String,
        uploadedAt: Date
      },
      completionNote: String,
      sourceSnag: ObjectId   // Reference to Snag (if task resolves a defect)
    }
  ],
  
  auditTrail: [...]
}
```

### Material Model Structure

```javascript
{
  name: String,              // e.g., "Cement"
  unit: String,              // e.g., "Bags", "kg", "Tons"
  project: ObjectId,         // Reference to Project
  organization: ObjectId,
  
  totalReceived: Number,     // Cumulative received qty
  totalConsumed: Number,     // Cumulative consumed qty
  balance: Number            // Virtual: totalReceived - totalConsumed
}
```

### MaterialUsage Model Structure (THE LINK)

```javascript
{
  project: ObjectId,         // Same project as Material
  organization: ObjectId,
  
  usedBy: ObjectId,          // User consuming the material (ref: User)
  usedByName: String,        // Denormalized user name
  
  // ⭐ THIS IS THE LINK TO MILESTONE TASKS
  locationOrTask: String,    // e.g., "Foundation-Task-001"
                             // or "Milestone: Foundation -> Task: Pour Concrete"
                             // or "Level 2, Wing A"
  
  items: [
    {
      materialId: ObjectId,  // Reference to Material document
      quantity: Number,      // How much was used
      unit: String           // Unit of measurement
    }
  ],
  
  commonNote: String,        // Additional context
  status: "Verified|Pending Verification|Rejected",
  timestamps: true
}
```

---

## How Materials are Linked to Milestone Tasks

### Current Implementation: Text-Based Reference

**The `locationOrTask` field in MaterialUsage is a STRING field**, not a foreign key. This means:

#### ✅ Current Approach (Text Reference)

```javascript
// When logging material usage for a specific task:
const materialUsage = new MaterialUsage({
  project: projectId,
  organization: orgId,
  usedBy: userId,
  usedByName: "Ram Singh",
  
  // LINK TO TASK: Text-based reference
  locationOrTask: "Milestone: Foundation Work -> Task: Pour concrete base",
  
  items: [
    {
      materialId: cementMaterialId,
      quantity: 50,
      unit: "Bags"
    }
  ],
  
  status: "Verified"
});

await materialUsage.save();

// Result: Material consumption is logged but not queryable by milestone
// To find materials used on a specific task, you must search by text pattern
```

#### Examples of `locationOrTask` Patterns

```
"Milestone: Foundation Work (MID:507f1f77bcf86cd799439011) -> Task: Pour Concrete Base"
"Level-2, Wing-A, Room-201"
"Structural Work - Rebar Installation"
"Task ID: 60d5ec49c1234567890abcde"
"Milestone: Electrical Work -> Task: Main Panel Installation"
```

---

## API Endpoints for Material-Milestone Integration

### 1. Create Milestone with Tasks
**Endpoint:** `POST /api/projects/[projectId]/milestones`

```javascript
{
  name: "Foundation Work",
  description: "Complete foundation preparation",
  dueDate: "2026-06-15",
  status: "Pending",
  tasks: [
    {
      title: "Excavate foundation",
      description: "Clear and excavate foundation area",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
      assignedTo: "user_123"
    },
    {
      title: "Pour concrete base",
      description: "Pour and cure concrete base",
      startDate: "2026-05-06",
      endDate: "2026-05-10",
      assignedTo: "user_456"
    }
  ]
}

// Response:
{
  _id: "milestone_123",
  tasks: [
    { _id: "task_001", title: "Excavate foundation", ... },
    { _id: "task_002", title: "Pour concrete base", ... }
  ]
}
```

### 2. Log Material Usage for a Specific Task
**Endpoint:** `POST /api/projects/[projectId]/material-usage`

```javascript
{
  usedBy: "user_456",
  locationOrTask: "Milestone: Foundation Work -> Task: Pour concrete base",
  items: [
    {
      materialId: "material_cement",
      quantity: 50,
      unit: "Bags"
    },
    {
      materialId: "material_sand",
      quantity: 30,
      unit: "Tons"
    }
  ],
  commonNote: "Concrete mix for foundation base",
  status: "Verified"
}

// Response:
{
  _id: "usage_001",
  project: "project_123",
  usedBy: "user_456",
  usedByName: "Ram Singh",
  locationOrTask: "Milestone: Foundation Work -> Task: Pour concrete base",
  items: [...],
  status: "Verified",
  createdAt: "2026-05-10T14:30:00Z"
}
```

**Auto-Updates on Save:**
- `Material(cement).totalConsumed += 50`
- `Material(sand).totalConsumed += 30`
- `Material(cement).balance = totalReceived - totalConsumed`
- `Material(cement).logs.push({ type: "Used", quantity: 50, ... })`

### 3. Fetch Materials Used by a Specific Task
**Endpoint:** `GET /api/projects/[projectId]/material-usage?locationOrTask=...`

```javascript
// Frontend query:
const taskReference = "Milestone: Foundation Work -> Task: Pour concrete base";
const response = await fetch(
  `/api/projects/${projectId}/material-usage?locationOrTask=${encodeURIComponent(taskReference)}`
);
const materialsUsed = await response.json();

// Response:
[
  {
    _id: "usage_001",
    items: [
      {
        materialId: "material_cement",
        quantity: 50,
        unit: "Bags"
      }
    ],
    usedBy: "user_456",
    usedByName: "Ram Singh",
    status: "Verified",
    createdAt: "2026-05-10T14:30:00Z"
  },
  {
    _id: "usage_002",
    items: [
      {
        materialId: "material_cement",
        quantity: 25,
        unit: "Bags"
      }
    ],
    usedBy: "user_789",
    usedByName: "Priya Sharma",
    status: "Verified",
    createdAt: "2026-05-11T09:15:00Z"
  }
]

// Total materials used: Cement 75 Bags
```

### 4. Fetch Material Balance (Current Inventory)
**Endpoint:** `GET /api/projects/[projectId]/materials`

```javascript
// Response:
[
  {
    _id: "material_cement",
    name: "Cement",
    unit: "Bags",
    totalReceived: 200,      // Via MaterialReceipt
    totalConsumed: 75,       // Via MaterialUsage entries
    balance: 125,            // Virtual field: 200 - 75
    logs: [
      { type: "Purchase", quantity: 200, date: "2026-04-15", ... },
      { type: "Received", quantity: 200, date: "2026-05-01", ... },
      { type: "Used", quantity: 50, date: "2026-05-10", note: "Foundation task" },
      { type: "Used", quantity: 25, date: "2026-05-11", note: "Foundation task" }
    ]
  }
]
```

### 5. Update Milestone Task Completion with Material Usage
**Endpoint:** `PATCH /api/projects/[projectId]/milestones/[milestoneId]`

```javascript
{
  tasks: [
    {
      _id: "task_002",
      title: "Pour concrete base",
      isCompleted: true,
      completedAt: "2026-05-10T16:00:00Z",
      completionNote: "Successfully poured and cured concrete base",
      proofImage: {
        url: "https://cdn.example.com/concrete-base.jpg",
        uploadedAt: "2026-05-10T16:00:00Z"
      }
    }
  ]
}

// The materials used in MaterialUsage with locationOrTask: "...Task: Pour concrete base"
// are now associated with a completed task
```

---

## Data Flow Example: Concrete Pouring Task

### Scenario
A project has a milestone "Foundation Work" with a task "Pour concrete base". The task consumes materials during execution.

### Step 1: Create Milestone with Task
```
POST /api/projects/proj_123/milestones
{
  name: "Foundation Work",
  tasks: [
    {
      _id: "task_concrete_001",
      title: "Pour concrete base"
    }
  ]
}

Result:
- Milestone created: milestone_123
- Task created: task_concrete_001
```

### Step 2: Material Receipt (Stock Arrives)
```
POST /api/projects/proj_123/material-receipts
{
  items: [
    { materialId: "cement_001", quantity: 200, unit: "Bags" }
  ]
}

Auto-Update:
- Material(cement_001).totalReceived = 200
- Material(cement_001).balance = 200 - 0 = 200
```

### Step 3: Material Usage (Task Consumes Stock)
```
POST /api/projects/proj_123/material-usage
{
  usedBy: userId,
  locationOrTask: "Milestone: Foundation Work -> Task: Pour concrete base",
  items: [
    { materialId: "cement_001", quantity: 50, unit: "Bags" }
  ],
  status: "Verified"
}

Auto-Update:
- Material(cement_001).totalConsumed += 50 = 50
- Material(cement_001).balance = 200 - 50 = 150
- Material(cement_001).logs.push({ type: "Used", quantity: 50, ... })
```

### Step 4: Mark Task Complete
```
PATCH /api/projects/proj_123/milestones/milestone_123
{
  tasks: [
    {
      _id: "task_concrete_001",
      isCompleted: true,
      completionNote: "50 bags cement used, concrete set successfully"
    }
  ]
}

Result:
- Task marked completed
- Materials consumed for this task can be queried via locationOrTask
```

### Step 5: Query Materials Used by Task
```
GET /api/projects/proj_123/material-usage?locationOrTask=Milestone: Foundation Work -> Task: Pour concrete base

Result:
{
  items: [{ materialId: "cement_001", quantity: 50 }],
  usedBy: userId,
  createdAt: timestamp
}

Remaining Material:
Material(cement_001).balance = 150 bags (200 received - 50 used)
```

---

## Important Design Considerations

### ✅ Advantages of Current Approach

1. **Flexibility**: Tasks and materials are loosely coupled
   - Tasks don't need to declare expected materials upfront
   - Materials can be used for any task/location without predefined mapping
   - Easy to add materials retroactively

2. **Audit Trail**: Complete history of consumption
   - `Material.logs` tracks every usage event
   - `MaterialUsage` records WHO used WHAT WHERE and WHEN

3. **Multi-tenancy**: Organization-scoped queries prevent data leakage

4. **Simplicity**: No complex foreign key relationships

### ⚠️ Limitations of Current Approach

1. **Not Queryable by Foreign Key**: Must use text search to find materials by task
   ```javascript
   // ❌ Cannot do this (no foreign key relationship):
   Material.find({ milestones: milestone_id })
   
   // ✅ Must do this (text pattern search):
   MaterialUsage.find({ 
     locationOrTask: /Pour concrete base/i 
   })
   ```

2. **Text Matching Issues**: If task names change, links break
   - If task renamed from "Pour concrete" to "Pour concrete base"
   - Old usage entries still reference "Pour concrete"
   - Results scattered across old and new names

3. **No Validation**: Can reference non-existent tasks
   - `locationOrTask` can be any string
   - No database-level enforcement that task actually exists

4. **Aggregation Complexity**: Complex to roll up materials by milestone
   - Cannot use MongoDB `$lookup` on string field
   - Must post-process results in application code

---

## Recommended Enhancements

### Short-term: Add Task ID Reference

Modify MaterialUsage schema to include optional milestone/task references:

```javascript
const MaterialUsageSchema = new mongoose.Schema({
  // Existing fields...
  
  // NEW: Explicit foreign key (optional for backward compatibility)
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Milestone"
  },
  
  task: {
    type: String  // Task ID/title from milestone.tasks[].title
  },
  
  // Keep for flexibility:
  locationOrTask: String  // "Milestone Name -> Task Name" text reference
});
```

Then queries become simple:
```javascript
// Find all materials used in a specific milestone
await MaterialUsage.find({ 
  project: projectId,
  milestone: milestoneId 
}).populate("milestone");

// Find all materials used for a specific task within a milestone
await MaterialUsage.find({ 
  project: projectId,
  milestone: milestoneId,
  task: taskTitle 
});
```

### Medium-term: Material Planning in Milestones

Extend Milestone schema to include expected materials:

```javascript
const MilestoneSchema = {
  name: String,
  tasks: [
    {
      title: String,
      // NEW: Planned materials for this task
      plannedMaterials: [
        {
          materialId: ObjectId,
          plannedQuantity: Number,
          unit: String
        }
      ]
    }
  ]
};

// Then compare planned vs actual:
const planned = milestone.tasks[0].plannedMaterials;
const actual = await MaterialUsage.findOne({ 
  milestone: milestone._id,
  task: milestone.tasks[0].title 
});

const variance = {
  plannedQty: planned.quantity,
  actualQty: actual.items.quantity,
  variance: actual.items.quantity - planned.quantity
};
```

### Long-term: Structured BOQ Integration

Link Bill of Quantities (BOQ) items to milestones:

```javascript
const MilestoneSchema = {
  boqItems: [
    {
      boqItemId: ObjectId,  // Reference to BOQ.BOQItem
      expectedMaterials: [{ materialId, quantity }],
      tasks: [
        {
          taskTitle: String,
          allocatedMaterials: [{ materialId, quantity }]
        }
      ]
    }
  ]
};

// Then MaterialUsage can link to BOQ item directly:
const MaterialUsageSchema = {
  boqItem: ObjectId,       // BOQ item being executed
  milestone: ObjectId,     // Which milestone
  task: String            // Which task
};
```

---

## Testing Scenarios

### Test 1: Basic Material Usage on Task
```javascript
// Create material, receive stock, use for task
1. Create Material: "Cement", 1000 Bags
2. Create MaterialReceipt: 200 Bags
   - Material.balance should be 200
3. Create MaterialUsage for "Task: Pour Base": 50 Bags
   - Material.balance should be 150
4. Verify Material.logs has entries: "Received", "Used"
```

### Test 2: Multiple Uses on Same Task
```javascript
// Same task uses material multiple times
1. Task: "Pour concrete base"
2. Day 1: Use 50 Bags cement
3. Day 2: Use 30 Bags cement
   - Query by locationOrTask should return both entries
   - Total used: 80 Bags
   - Material.balance: 200 - 80 = 120
```

### Test 3: Task Completion with Material Proof
```javascript
// Complete task with image proof of material usage
1. Create MaterialUsage: 50 Bags cement used
   - status: "Verified"
2. Mark Task complete:
   - completionNote: "Poured successfully with 50 bags cement"
   - proofImage: "concrete_base.jpg"
3. Verify Material.logs includes task reference
```

### Test 4: Query Materials by Task
```javascript
// Get all materials used on specific task
1. Create 3 tasks in milestone
2. Log materials for each task with distinct locationOrTask
3. Query: GET /api/projects/[id]/material-usage?locationOrTask=TaskB
   - Should return only materials for TaskB
4. Aggregate total usage across all tasks
```

---

## Summary

**Materials are linked to Milestone Tasks through:**

1. **MaterialUsage.locationOrTask** field (text-based reference)
2. Material consumed → `Material.totalConsumed++` → `balance` updates
3. Audit logged in `Material.logs` array
4. Tasks track completion but not materials directly (materials tracked separately)

**Material-Milestone Integration Flow:**
```
Milestone Task Created
       ↓
Material Needed on Task
       ↓
MaterialUsage.locationOrTask = "Task Name"
       ↓
Material Consumed (inventory updated)
       ↓
Task Completed (with proof image)
       ↓
Material usage queryable by task reference
```

**Key Limitation:** Current implementation uses text-based linking, not foreign keys. Future versions should add explicit `milestone` and `task` ObjectId references to `MaterialUsage` for better queryability and referential integrity.

---

**Document Prepared**: May 1, 2026  
**Status**: Complete Analysis & Recommendations
