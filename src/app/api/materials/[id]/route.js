import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Material from "@/models/Material";
import { withAuth } from "@/lib/middleware";

// PATCH: Record stock In/Out
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();
    const body = await req.json();
    const { type, quantity, note } = body;

    const material = await Material.findOne({ 
      _id: id, 
      organization: req.user.organizationId 
    });

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 });
    }

    // Update totals
    if (type === "Received" || type === "Purchase") {
      material.totalReceived += Number(quantity);
    } else if (type === "Used") {
      material.totalConsumed += Number(quantity);
    }
    // "Request" doesn't change stock totals until it's "Received"

    // Add log
    material.logs.push({
      type,
      quantity: Number(quantity),
      note,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      date: new Date()
    });

    await material.save();
    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ message: "Error updating stock", error: error.message }, { status: 500 });
  }
});

// DELETE: Remove material
export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();
    const material = await Material.findOneAndDelete({ 
      _id: id, 
      organization: req.user.organizationId 
    });

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Material deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting material", error: error.message }, { status: 500 });
  }
});
