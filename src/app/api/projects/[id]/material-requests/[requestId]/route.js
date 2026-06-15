import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialRequest from "@/models/MaterialRequest";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id: projectId, requestId } = await params;
    await dbConnect();
    const { status } = await req.json();

    const request = await MaterialRequest.findOne({
      _id: requestId,
      project: projectId,
      organization: req.user.organizationId,
    });
    if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 });

    request.status = status;
    await request.save();
    emitToProject(projectId, "material:updated");
    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ message: "Error updating request" }, { status: 500 });
  }
});

export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id: projectId, requestId } = await params;
    await dbConnect();

    const request = await MaterialRequest.findOneAndDelete({
      _id: requestId,
      project: projectId,
      organization: req.user.organizationId,
    });
    if (!request) return NextResponse.json({ message: "Request not found" }, { status: 404 });

    emitToProject(projectId, "material:updated");
    return NextResponse.json({ message: "Request deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting request" }, { status: 500 });
  }
});
