import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import PlanFolder from "@/models/PlanFolder";
import { withAuth } from "@/lib/middleware";
import User from "@/models/User";
import TemplateCategory from "@/models/TemplateCategory";
import Organization from "@/models/Organization";
export const GET = withAuth(async function (req) {
  try {
    await dbConnect();
    
    const userDoc = await User.findById(req.user.id).populate("role");
    const isAdmin = userDoc?.role?.name === "Admin" || req.user.role === "Admin";
    
    let query = { organization: req.user.organizationId };
    
    if (!isAdmin) {
      query._id = { $in: userDoc?.projects || [] };
    }

    const projects = await Project.find(query)
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .populate("siteSurveyor", "name email")
      .populate("category", "name");

    // Find which projects have at least one Pending plan document
    const projectIds = projects.map((p) => p._id);
    const pendingFolders = await PlanFolder.find(
      {
        project: { $in: projectIds },
        documents: {
          $elemMatch: {
            approvals: {
              $elemMatch: { user: req.user.id, status: "Pending" }
            }
          }
        }
      },
      { project: 1 }
    );
    const pendingSet = new Set(pendingFolders.map((f) => f.project.toString()));

    const result = projects.map((p) => ({
      ...p.toObject(),
      hasPendingPlans: pendingSet.has(p._id.toString()),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    require('fs').writeFileSync('error_log.txt', error.stack || error.message);
    return NextResponse.json({ message: "Error fetching projects", error: error.message, stack: error.stack }, { status: 500 });
  }
});

export const POST = withAuth(async function (req) {
  try {
    await dbConnect();
    const { name, description, category, clientName, clientEmail, clientPhone, status, createdBy, members, startDate, endDate, documents, budget, needSiteSurvey } = await req.json();

    const projectData = {
      name,
      description,
      category,
      clientName,
      clientEmail,
      clientPhone,
      status,
      createdBy,
      members,
      startDate,
      endDate,
      documents: documents?.map(doc => ({
        ...doc,
        status: "Approved",
        uploadedBy: {
          user: req.user.id || createdBy,
          name: req.user.name || "Creator"
        }
      })),
      needSiteSurvey: needSiteSurvey || false,
      organization: req.user.organizationId,
    };

    // Initialize budget history if budget is provided
    if (budget) {
      projectData.budgetHistory = [{
        amount: Number(budget),
        reason: "Estimated Budget",
        approvalStatus: "Approved",
        updatedBy: req.user.id || createdBy,
        updatedByName: req.user.name || "System Creator",
        timestamp: new Date()
      }];
    }

    const project = new Project(projectData);

    // Add audit entry
    project.auditTrail.push({
      user: req.user.id || createdBy,
      userName: req.user.name || "Creator",
      userRole: req.user.role || "Member",
      action: "Create",
      details: `Project ${name} created`,
    });

    await project.save();

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating project", error: error.message }, { status: 500 });
  }
});
