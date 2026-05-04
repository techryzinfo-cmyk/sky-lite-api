import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Milestone from "@/models/Milestone";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

export const PATCH = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id, milestoneId } = await params;
    const updates = await req.json();

    const milestone = await Milestone.findOne({
      _id: milestoneId,
      project: id,
      organization: req.user.organizationId
    });

    if (!milestone) {
      return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    }

    // Track status change for audit log
    if (updates.status && updates.status !== milestone.status) {
      milestone.auditTrail.push({
        user: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: "StatusChange",
        details: `Status changed from ${milestone.status} to ${updates.status}`,
      });
      
      if (updates.status === "Completed") {
        milestone.completedAt = new Date();
      } else {
        milestone.completedAt = null;
      }
    }

    // Track task updates
    if (updates.tasks) {
        milestone.auditTrail.push({
            user: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: "TaskUpdated",
            details: `Tasks updated`,
        });
    }

    // Generic update
    Object.assign(milestone, updates);

    await milestone.save();
    emitToProject(id, 'milestone:updated', { milestoneId });

    return NextResponse.json(milestone);
  } catch (error) {
    return NextResponse.json({ message: "Error updating milestone", error: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id, milestoneId } = await params;

    const result = await Milestone.deleteOne({
      _id: milestoneId,
      project: id,
      organization: req.user.organizationId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    }

    emitToProject(id, 'milestone:deleted', { milestoneId });
    return NextResponse.json({ message: "Milestone deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting milestone", error: error.message }, { status: 500 });
  }
});
