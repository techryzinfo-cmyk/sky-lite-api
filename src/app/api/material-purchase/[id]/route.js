import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialPurchase from "@/models/MaterialPurchase";
import { withAuth } from "@/lib/middleware";

// PATCH: Update purchase status
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id: purchaseId } = await params;
    await dbConnect();
    const { status } = await req.json();

    if (!["Pending Approval", "Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const purchase = await MaterialPurchase.findOne({ 
      _id: purchaseId,
      organization: req.user.organizationId 
    });

    if (!purchase) {
      return NextResponse.json({ message: "Material purchase not found" }, { status: 404 });
    }

    purchase.status = status;
    await purchase.save();

    return NextResponse.json({
      message: `Purchase marked as ${status}`,
      purchase
    });
  } catch (error) {
    console.error("Update material purchase error:", error);
    return NextResponse.json({ message: "Error updating material purchase", error: error.message }, { status: 500 });
  }
});

// DELETE: Remove material purchase
export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id: purchaseId } = await params;
    await dbConnect();

    const purchase = await MaterialPurchase.findOneAndDelete({ 
      _id: purchaseId,
      organization: req.user.organizationId 
    });

    if (!purchase) {
      return NextResponse.json({ message: "Material purchase not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Delete material purchase error:", error);
    return NextResponse.json({ message: "Error deleting material purchase" }, { status: 500 });
  }
});
