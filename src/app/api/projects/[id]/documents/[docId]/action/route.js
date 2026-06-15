import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import User from "@/models/User";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";
import { sendEmail } from "@/lib/email";
import { documentDecisionEmail } from "@/lib/emailTemplates";

/**
 * PATCH /api/projects/:id/documents/:docId/action
 * 
 * Approves or Rejects a compliance document.
 */
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id, docId } = await params;
    await dbConnect();

    const { action } = await req.json(); // "Approved" or "Rejected"

    if (!["Approved", "Rejected"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    // Check permissions
    const isAdmin = req.user.role === "Admin";
    const canApprove = isAdmin || req.user.permissions?.includes("land:approve") || req.user.permissions?.includes("*");
    
    if (!canApprove) {
      return NextResponse.json({ message: "Forbidden: No approval permission" }, { status: 403 });
    }

    const project = await Project.findOne({ 
      _id: id, 
      organization: req.user.organizationId 
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const document = project.documents.id(docId);
    if (!document) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    // Rule: Cannot approve your own document (unless Admin)
    const uploaderId = document.uploadedBy?.user?.toString() || document.uploadedBy?.toString();
    
    if (uploaderId === req.user.id && !isAdmin) {
      return NextResponse.json({ message: "You cannot approve your own document" }, { status: 403 });
    }

    document.status = action;

    project.auditTrail.push({
      user: req.user.id,
      userName: req.user.name || "User",
      userRole: req.user.role?.name || "Member",
      action: "Update",
      details: `${action} document: ${document.name}`,
    });

    await project.save();

    // Notify the document uploader of the decision
    const uploaderUserId = document.uploadedBy?.user;
    if (uploaderUserId) {
      const uploader = await User.findById(uploaderUserId).select("name email");
      if (uploader?.email) {
        sendEmail({
          to: uploader.email,
          subject: `Document ${action} — ${document.name}`,
          html: documentDecisionEmail({
            uploaderName: uploader.name,
            approverName: req.user.name || "Admin",
            projectName: project.name,
            documentName: document.name,
            action,
          }),
        });
      }
    }

    emitToProject(id, 'documents:updated');
    return NextResponse.json(document);
  } catch (error) {
    console.error("Document action error:", error);
    return NextResponse.json(
      { message: "Error performing action" },
      { status: 500 }
    );
  }
});
