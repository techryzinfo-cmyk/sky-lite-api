import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import PlanFolder from "@/models/PlanFolder";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async function (req) {
  try {
    await dbConnect();
    console.log("hello")
    const projects = await Project.find({ organization: req.user.organizationId })
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .populate("siteSurveyor", "name email");

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
    return NextResponse.json({ message: "Error fetching projects", error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async function (req) {
  try {
    await dbConnect();
    const { name, description, clientName, clientEmail, clientPhone, status, createdBy, members, startDate, endDate, documents, budget, needSiteSurvey } = await req.json();

    const projectData = {
      name,
      description,
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
