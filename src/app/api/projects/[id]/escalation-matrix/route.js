import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EscalationMatrix from "@/models/EscalationMatrix";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

export const GET = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    let matrix = await EscalationMatrix.findOne({ project: id })
      .populate({ 
        path: 'levels.user', 
        select: 'name email phoneNumber role',
        populate: { path: 'role', select: 'name' }
      });

    if (!matrix) {
      // Return a default structure if not found
      return NextResponse.json({ 
        project: id, 
        levels: [
          { level: 1, role: "Site Supervisor", responseTime: "4 Hours" },
          { level: 2, role: "Project Manager", responseTime: "24 Hours" },
          { level: 3, role: "Operations Head", responseTime: "48 Hours" }
        ] 
      });
    }

    return NextResponse.json(matrix);
  } catch (error) {
    console.error("Fetch matrix error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    await dbConnect();

    const matrix = await EscalationMatrix.findOneAndUpdate(
      { project: id },
      { 
        $set: {
          ...body, 
          project: id, 
          organization: req.user.organizationId,
          updatedBy: req.user.id 
        },
        $push: {
          auditTrail: {
            user: req.user.id,
            userName: req.user.name || "Admin",
            action: "MatrixUpdated",
            details: `Escalation matrix configured with ${body.levels?.length || 0} levels by ${req.user.name || "Admin"}`,
            timestamp: new Date()
          }
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    emitToProject(id, 'escalation:updated');
    return NextResponse.json(matrix);
  } catch (error) {
    console.error("Save matrix error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
});
