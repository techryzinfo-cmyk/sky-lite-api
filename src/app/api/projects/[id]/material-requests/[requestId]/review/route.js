import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialRequest from "@/models/MaterialRequest";
import { withAuth } from "@/lib/middleware";

// POST: Review Material Request
export const POST = withAuth(async function (req, { params }) {
  try {
    const { id: projectId, requestId: mrId } = await params;
    await dbConnect();
    
    // items: [{ materialId, approvedQuantity }]
    const { status, items } = await req.json();

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const mr = await MaterialRequest.findOne({ 
      _id: mrId, 
      project: projectId,
      organization: req.user.organizationId 
    });

    if (!mr) {
      return NextResponse.json({ message: "Material Request not found" }, { status: 404 });
    }

    if (status === "Approved") {
      // Process items for approval (full or partial)
      let allFullyApproved = true;

      // Update approved quantities
      mr.items = mr.items.map((item) => {
        const approvedItem = items.find((i) => i.materialId === item.materialId.toString());
        const approvedQty = approvedItem ? approvedItem.approvedQuantity : 0;
        
        if (approvedQty < item.quantity) {
          allFullyApproved = false;
        }

        return {
          ...item.toObject(),
          approvedQuantity: approvedQty
        };
      });
      
      // If partially approved, we still mark the overall MR as "Approved" but the items hold the exact approved amounts.
      mr.status = "Approved"; 
    } else {
      mr.status = "Rejected";
    }

    await mr.save();

    const { emitToProject } = await import("@/lib/socket-server");
    emitToProject(projectId, 'material:updated');

    return NextResponse.json({ message: `Material Request ${status}`, mr });
  } catch (error) {
    console.error("Review MR error:", error);
    return NextResponse.json({ message: "Error reviewing material request" }, { status: 500 });
  }
});
