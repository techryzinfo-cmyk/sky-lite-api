import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import PlanFolder from "@/models/PlanFolder";
import { withAuth } from "@/lib/middleware";
import User from "@/models/User";
import Role from "@/models/Role";
import TemplateCategory from "@/models/TemplateCategory";
import Organization from "@/models/Organization";
export const GET = withAuth(async function (req) {
  try {
    await dbConnect();
    
    const userDoc = await User.findById(req.user.id).populate("role");
    const isAdmin = userDoc?.role?.name === "Admin" || req.user.role === "Admin";

    let query = { organization: req.user.organizationId };

    if (!isAdmin) {
      query.$or = [
        { _id: { $in: userDoc?.projects || [] } },
        { members: userDoc._id },
      ];
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

    // Fetch site surveys for these projects to determine survey status
    const SiteSurvey = require("@/models/SiteSurvey").default || require("@/models/SiteSurvey");
    const surveys = await SiteSurvey.find({ project: { $in: projectIds } }, { project: 1, status: 1, rejectionReason: 1 });
    const surveyStatusMap = {};
    const surveyRejectMap = {};
    surveys.forEach(s => {
      surveyStatusMap[s.project.toString()] = s.status;
      surveyRejectMap[s.project.toString()] = s.rejectionReason;
    });

    const result = projects.map((p) => ({
      ...p.toObject(),
      hasPendingPlans: pendingSet.has(p._id.toString()),
      surveyStatus: surveyStatusMap[p._id.toString()] || null,
      surveyRejectionReason: surveyRejectMap[p._id.toString()] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ message: "Error fetching projects", error: error.message, stack: error.stack }, { status: 500 });
  }
});

export const POST = withAuth(async function (req) {
  try {
    await dbConnect();
    const { name, description, category, projectType, clientName, clientEmail, clientPhone, status, createdBy, members, startDate, endDate, documents, budget, needSiteSurvey } = await req.json();

    const projectData = {
      name,
      description,
      currency: currency || "AED",
      projectType: projectType || "Construction",
      category,
      projectType: projectType || "Construction",
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

    const creatorUserId = req.user.id || createdBy;
    if (creatorUserId && !project.members.includes(creatorUserId)) {
      project.members.push(creatorUserId);
    }

    // Add audit entry
    project.auditTrail.push({
      user: req.user.id || createdBy,
      userName: req.user.name || "Creator",
      userRole: req.user.role || "Member",
      action: "Create",
      details: `Project ${name} created`,
    });

    await project.save();

    // Automatically add the project to the creator's assigned projects list
    if (creatorUserId) {
      await User.findByIdAndUpdate(creatorUserId, {
        $addToSet: { projects: project._id }
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating project", error: error.message }, { status: 500 });
  }
});
