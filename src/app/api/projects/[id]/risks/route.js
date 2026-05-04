import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Risk from "@/models/Risk";
import Project from "@/models/Project";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";
import { recordAudit } from "@/lib/auditHelper";

export const GET = withAuth(async function (req, { params }) {
  try {
    const { id } =await params;
    await dbConnect();

    const risks = await Risk.find({ project: id })
      .populate('owner', 'name email')
      .populate('history.updatedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(risks);
  } catch (error) {
    console.error("Fetch risks error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async function (req, { params }) {
  try {
    const { id } =await params;
    const body = await req.json();
    await dbConnect();

    const newRisk = await Risk.create({
      ...body,
      project: id,
      organization: req.user.organizationId,
      owner: body.owner || req.user.id
    });

    // Record audit trail in Risk document
    await recordAudit(newRisk, req.user, "Create", "Initial risk identification");

    // Record audit trail in project
    const project = await Project.findById(id);
    if (project) {
      await recordAudit(project, req.user, "RiskAdded", `Risk identified: ${body.title}`);
    }

    emitToProject(id, 'risk:updated');
    return NextResponse.json(newRisk, { status: 201 });
  } catch (error) {
    console.error("Create risk error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});
