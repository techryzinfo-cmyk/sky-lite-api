import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import BOQ from "@/models/BOQ";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

/**
 * PATCH /api/projects/:id/boq/:itemId
 */
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id, itemId } = await params;
    await dbConnect();

    const updates = await req.json();
    const item = await BOQ.findOne({ _id: itemId, project: id });

    if (!item) {
      return NextResponse.json({ message: "BOQ item not found" }, { status: 404 });
    }

    // Create a new version instead of updating the existing one
    const oldVersion = item.version || 1;
    const historyId = item.historyId || item._id;

    // Mark old as not latest
    item.isLatest = false;
    await item.save();

    // Create new version
    const newBOQItem = new BOQ({
      project: id,
      groupName: updates.groupName || item.groupName,
      itemNumber: updates.itemNumber !== undefined ? updates.itemNumber : item.itemNumber,
      itemDescription: updates.itemDescription || item.itemDescription,
      unit: updates.unit !== undefined ? updates.unit : item.unit,
      quantity: updates.quantity !== undefined ? Number(updates.quantity) : item.quantity,
      unitCost: updates.unitCost !== undefined ? Number(updates.unitCost) : item.unitCost,
      remark: updates.remark !== undefined ? updates.remark : item.remark,
      version: oldVersion + 1,
      isLatest: true,
      historyId: historyId,
      createdBy: req.user.id,
      createdByName: req.user.name || "User",
      status: "Draft" // Reset status to Draft on update
    });

    newBOQItem.totalCost = (newBOQItem.quantity || 0) * (newBOQItem.unitCost || 0);
    await newBOQItem.save();

    // Return the new version to the client
    const responseItem = newBOQItem;

    const project = await Project.findById(id);
    if (project) {
      project.auditTrail.push({
        user: req.user.id,
        userName: req.user.name || "User",
        userRole: req.user.role === "Admin" ? "Admin" : (req.user.role?.name || "Member"),
        action: "Update",
        details: `Updated BOQ item: ${newBOQItem.itemNumber || newBOQItem.itemDescription} (v${newBOQItem.version})`,
      });
      await project.save();
    }

    emitToProject(id, 'boq:updated');
    return NextResponse.json(newBOQItem);
  } catch (error) {
    console.error("BOQ update error:", error);
    return NextResponse.json({ message: "Error updating BOQ", error: error.message }, { status: 500 });
  }
});

/**
 * DELETE /api/projects/:id/boq/:itemId
 */
export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id, itemId } = await params;
    await dbConnect();

    const item = await BOQ.findOneAndDelete({ _id: itemId, project: id });
    if (!item) {
      return NextResponse.json({ message: "BOQ item not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (project) {
      project.auditTrail.push({
        user: req.user.id,
        userName: req.user.name || "User",
        userRole: req.user.role === "Admin" ? "Admin" : (req.user.role?.name || "Member"),
        action: "Update",
        details: `Deleted BOQ item: ${item.itemNumber || item.itemDescription}`,
      });
      await project.save();
    }

    emitToProject(id, 'boq:updated');
    return NextResponse.json({ message: "BOQ item deleted" });
  } catch (error) {
    console.error("BOQ delete error:", error);
    return NextResponse.json({ message: "Error deleting BOQ", error: error.message }, { status: 500 });
  }
});
