import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PlanFolder from "@/models/PlanFolder";
import Project from "@/models/Project";
import User from "@/models/User";
import Role from "@/models/Role";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

// PUT /api/projects/[id]/folders/[folderId]
// Add a document to a folder
export const PUT = withAuth(async function (req, { params }) {
  try {
    const { id, folderId } = await params;
    await dbConnect();

    const { url, name, mimeType, size } = await req.json();

    if (!url || !name) {
      return NextResponse.json({ message: "Document URL and name are required" }, { status: 400 });
    }

    const folder = await PlanFolder.findOne({ _id: folderId, project: id });
    if (!folder) {
      return NextResponse.json({ message: "Folder not found in this project" }, { status: 404 });
    }

    folder.documents.push({ url, name, mimeType, size, uploadedAt: new Date() });
    await folder.save();

    const project = await Project.findById(id);
    if (project) {
      project.auditTrail.push({
        user: req.user.id,
        userName: req.user.name || "User",
        userRole: req.user.role || "Member",
        action: "Update",
        details: `Uploaded document '${name}' to folder '${folder.name}'`,
      });
      await project.save();
    }

    emitToProject(id, 'plans:updated');
    return NextResponse.json(folder);
  } catch (error) {
    return NextResponse.json({ message: "Error updating folder", error: error.message }, { status: 500 });
  }
});

/**
 * PATCH /api/projects/[id]/folders/[folderId]
 *
 * Three actions via `action` field:
 *
 * 1. action: "sendForApproval"
 *    Body: { docId, approverIds: [userId, ...] }
 *    → Only Admin. Sets doc to Pending, creates per-approver entries.
 *
 * 2. action: "respond"
 *    Body: { docId, response: "Approved"|"Rejected", note?: string }
 *    → Only users with plans:approve. Updates caller's approval entry.
 *      If all Approved → doc becomes Approved.
 *      Any Rejected → doc becomes Rejected immediately.
 *
 * 3. action: "revertToDraft"
 *    Body: { docId }
 *    → Only Admin. Clears approvals, resets to Draft.
 */
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id, folderId } = await params;
    await dbConnect();

    const body = await req.json();
    const { action, docId } = body;

    if (!docId || !action) {
      return NextResponse.json({ message: "docId and action are required" }, { status: 400 });
    }

    const folder = await PlanFolder.findOne({ _id: folderId, project: id });
    if (!folder) return NextResponse.json({ message: "Folder not found" }, { status: 404 });

    const doc = folder.documents.id(docId);
    if (!doc) return NextResponse.json({ message: "Document not found" }, { status: 404 });

    const isAdmin = req.user.role === "Admin";

    // ── 1. sendForApproval ──────────────────────────────────────────
    if (action === "sendForApproval") {
      if (!isAdmin) {
        return NextResponse.json({ message: "Only admins can send plans for approval" }, { status: 403 });
      }

      const { approverIds } = body;
      if (!Array.isArray(approverIds) || approverIds.length === 0) {
        return NextResponse.json({ message: "At least one approver must be selected" }, { status: 400 });
      }

      // Fetch approver user details
      const approvers = await User.find({ _id: { $in: approverIds } })
        .populate("role", "name")
        .select("name role");

      doc.approvalStatus = "Pending";
      doc.approvalNote = "";
      doc.approvals = approvers.map((u) => ({
        user: u._id,
        userName: u.name,
        userRole: u.role?.name || "Member",
        status: "Pending",
        note: "",
        respondedAt: null,
      }));

      await folder.save();

      const project = await Project.findById(id);
      if (project) {
        project.auditTrail.push({
          user: req.user.id,
          userName: req.user.name || "User",
          userRole: req.user.role || "Member",
          action: "Update",
          details: `Document '${doc.name}' sent for approval to ${approvers.map((u) => u.name).join(", ")}`,
        });
        await project.save();
      }

      emitToProject(id, 'plans:updated');
      return NextResponse.json(folder);
    }

    // ── 2. respond (approve / reject) ──────────────────────────────
    if (action === "respond") {
      const { response, note } = body;
      if (!["Approved", "Rejected"].includes(response)) {
        return NextResponse.json({ message: "response must be Approved or Rejected" }, { status: 400 });
      }

      // Permission check: must have plans:approve
      if (!isAdmin) {
        const userRole = await Role.findOne({ name: req.user.role, organization: req.user.organizationId });
        if (!userRole?.permissions?.includes("plans:approve")) {
          return NextResponse.json({ message: "You don't have permission to approve or reject plans" }, { status: 403 });
        }
      }

      // Find this user's approval entry
      const entry = doc.approvals.find((a) => a.user.toString() === req.user.id);
      if (!entry) {
        return NextResponse.json({ message: "You are not an assigned approver for this document" }, { status: 403 });
      }
      if (entry.status !== "Pending") {
        return NextResponse.json({ message: "You have already responded to this document" }, { status: 400 });
      }

      entry.status = response;
      entry.note = note || "";
      entry.respondedAt = new Date();

      // Compute overall status
      if (response === "Rejected") {
        doc.approvalStatus = "Rejected";
        doc.approvalNote = note || "";
      } else {
        // Check if all approvers have approved
        const allApproved = doc.approvals.every((a) => a.status === "Approved");
        if (allApproved) {
          doc.approvalStatus = "Approved";
        }
        // else stays "Pending" — others still need to respond
      }

      folder.markModified("documents");
      await folder.save();

      const project = await Project.findById(id);
      if (project) {
        project.auditTrail.push({
          user: req.user.id,
          userName: req.user.name || "User",
          userRole: req.user.role || "Member",
          action: "Update",
          details: `Document '${doc.name}' ${response.toLowerCase()} by ${req.user.name}`,
        });
        await project.save();
      }

      emitToProject(id, 'plans:updated');
      return NextResponse.json(folder);
    }

    // ── 3. revertToDraft ───────────────────────────────────────────
    if (action === "revertToDraft") {
      if (!isAdmin) {
        return NextResponse.json({ message: "Only admins can revert documents to Draft" }, { status: 403 });
      }

      doc.approvalStatus = "Draft";
      doc.approvalNote = "";
      doc.approvals = [];

      await folder.save();

      const project = await Project.findById(id);
      if (project) {
        project.auditTrail.push({
          user: req.user.id,
          userName: req.user.name || "User",
          userRole: req.user.role || "Member",
          action: "Update",
          details: `Document '${doc.name}' reverted to Draft`,
        });
        await project.save();
      }

      emitToProject(id, 'plans:updated');
      return NextResponse.json(folder);
    }

    // ── 4. deleteDocument ──────────────────────────────────────────
    if (action === "deleteDocument") {
      if (!isAdmin) {
        return NextResponse.json({ message: "Only admins can delete documents" }, { status: 403 });
      }

      folder.documents.pull({ _id: docId });
      await folder.save();

      const project = await Project.findById(id);
      if (project) {
        project.auditTrail.push({
          user: req.user.id,
          userName: req.user.name || "User",
          userRole: req.user.role || "Member",
          action: "Update",
          details: `Document '${doc.name}' deleted from folder '${folder.name}'`,
        });
        await project.save();
      }

      emitToProject(id, 'plans:updated');
      return NextResponse.json(folder);
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: "Error updating document", error: error.message }, { status: 500 });
  }
});

// DELETE /api/projects/[id]/folders/[folderId]
export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id, folderId } = await params;
    await dbConnect();

    const folder = await PlanFolder.findOneAndDelete({ _id: folderId, project: id });
    if (!folder) {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 });
    }

    emitToProject(id, 'plans:updated');
    return NextResponse.json({ message: "Folder deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting folder", error: error.message }, { status: 500 });
  }
});
