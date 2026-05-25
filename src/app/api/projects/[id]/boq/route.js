import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import BOQ from "@/models/BOQ";
import mongoose from "mongoose";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

/**
 * GET /api/projects/:id/boq
 * 
 * Fetches all BOQ items for a specific project.
 */
export const GET = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const items = await BOQ.find({ project: id, isLatest: { $ne: false } }).sort({ createdAt: 1 });
    
    // Enrich items with lastApprovedCost if their current status is not Approved
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let lastApprovedCost = null;
      if (item.status !== "Approved") {
        const prevApproved = await BOQ.findOne({
          historyId: item.historyId || item._id,
          status: "Approved"
        }).sort({ version: -1 });
        if (prevApproved) {
          lastApprovedCost = prevApproved.totalCost;
        }
      }
      return {
        ...item.toObject(),
        lastApprovedCost
      };
    }));

    return NextResponse.json(enrichedItems);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching BOQ", error: error.message }, { status: 500 });
  }
});

/**
 * POST /api/projects/:id/boq
 * 
 * Adds one or more items to the project's Bill of Quantities.
 */
export const POST = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const { items } = await req.json(); // Expecting an array of items or a single item

    const project = await Project.findOne({
      _id: id,
      organization: req.user.organizationId
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const itemsArray = Array.isArray(items) ? items : [items];
    const boqData = itemsArray.map(item => {
      const _id = new mongoose.Types.ObjectId();
      return {
        ...item,
        _id,
        project: id,
        historyId: _id, // For version 1, historyId matches original _id
        version: 1,
        isLatest: true,
        createdBy: req.user.id,
        createdByName: req.user.name || "User",
        totalCost: (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
      };
    });

    const result = await BOQ.insertMany(boqData);

    project.auditTrail.push({
      user: req.user.id,
      userName: req.user.name || "User",
      userRole: req.user.role === "Admin" ? "Admin" : (req.user.role?.name || "Member"),
      action: "Update",
      details: `Added ${result.length} items to BOQ`,
    });

    await project.save();
    emitToProject(id, 'boq:updated', { count: result.length });

    return NextResponse.json(result);
  } catch (error) {
    console.error("BOQ add error:", error);
    return NextResponse.json(
      { message: "Error adding BOQ items", error: error.message },
      { status: 500 }
    );
  }
});
