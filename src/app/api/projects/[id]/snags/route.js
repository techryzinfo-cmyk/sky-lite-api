import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Snag from "@/models/Snag";
import Project from "@/models/Project";
import User from "@/models/User";
import { withAuth } from "@/lib/middleware";
import { recordAudit } from "@/lib/auditHelper";
import { sendEmail } from "@/lib/email";
import { snagAssignedEmail } from "@/lib/emailTemplates";
import { emitToProject } from "@/lib/socket-server";

export const GET = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const snags = await Snag.find({ project: id })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(snags);
  } catch (error) {
    console.error("Fetch snags error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    await dbConnect();

    const newSnag = await Snag.create({
      ...body,
      project: id,
      organization: req.user.organizationId,
      createdBy: req.user.id,
      status: body.status || "Draft"
    });

    // Record audit trail in project
    const project = await Project.findById(id);
    if (project) {
      await recordAudit(project, req.user, "SnagAdded", `Snag reported: ${body.title}`);
    }

    // Email the assigned user (if any)
    if (body.assignedTo) {
      const assignee = await User.findById(body.assignedTo).select("name email");
      if (assignee?.email) {
        sendEmail({
          to: assignee.email,
          subject: `Snag Assigned to You — ${body.title}`,
          html: snagAssignedEmail({
            assigneeName: assignee.name,
            reporterName: req.user.name || "Team Member",
            projectName: project?.name || "Project",
            snagTitle: body.title,
            priority: body.priority,
          }),
        });
      }
    }

    emitToProject(id, 'snag:created', { snagId: newSnag._id.toString() });
    return NextResponse.json(newSnag, { status: 201 });
  } catch (error) {
    console.error("Create snag error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});
