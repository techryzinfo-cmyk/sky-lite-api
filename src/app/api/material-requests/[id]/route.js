import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialRequest from "@/models/MaterialRequest";
import Material from "@/models/Material";
import { withAuth } from "@/lib/middleware";

// PATCH: Update request status
export const PATCH = withAuth(async function (req, { params }) {
  try {
    const { id: requestId } = await params;
    await dbConnect();
    const { status } = await req.json();

    if (!["Pending", "Approved", "Rejected", "Fulfilled"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const materialRequest = await MaterialRequest.findOne({ 
      _id: requestId,
      organization: req.user.organizationId 
    });

    if (!materialRequest) {
      return NextResponse.json({ message: "Material request not found" }, { status: 404 });
    }

    // Prevent moving back to pending or modifying already fulfilled/rejected requests if needed,
    // but for now, we just update the status.
    const previousStatus = materialRequest.status;
    materialRequest.status = status;

    // Update the request status but do not modify actual inventory numbers.
    // The request acts purely as an approval workflow.
    materialRequest.status = status;

    await materialRequest.save();

    return NextResponse.json({
      message: `Request marked as ${status}`,
      request: materialRequest
    });
  } catch (error) {
    console.error("Update material request error:", error);
    return NextResponse.json({ message: "Error updating material request", error: error.message }, { status: 500 });
  }
});

// DELETE: Remove material request
export const DELETE = withAuth(async function (req, { params }) {
  try {
    const { id: requestId } = await params;
    await dbConnect();

    const request = await MaterialRequest.findOneAndDelete({ 
      _id: requestId,
      organization: req.user.organizationId 
    });

    if (!request) {
      return NextResponse.json({ message: "Material request not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete material request error:", error);
    return NextResponse.json({ message: "Error deleting material request" }, { status: 500 });
  }
});
