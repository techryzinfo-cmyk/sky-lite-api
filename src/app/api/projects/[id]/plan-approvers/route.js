import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import User from "@/models/User";
import Role from "@/models/Role";
import { withAuth } from "@/lib/middleware";

/**
 * GET /api/projects/:id/plan-approvers
 *
 * Returns users who are assigned to this project (via either Project.members
 * OR User.projects) AND whose role has the "plans:approve" (or "*") permission.
 */
export const GET = withAuth(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    // 1. First find all roles that have plans:approve or wildcard "*"
    const approverRoles = await Role.find({
      permissions: { $in: ["plans:approve", "*"] }
    }).select("_id");

    const approverRoleIds = approverRoles.map(r => r._id);

    if (approverRoleIds.length === 0) {
      return NextResponse.json([]); // No roles have this permission
    }

    // 2. Also get the project to collect its members array
    const project = await Project.findById(id).select("members");
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    // 3. Find all users who:
    //    - Have an approver role, AND
    //    - Are assigned to this project via User.projects OR Project.members
    const assignedUsers = await User.find({
      role: { $in: approverRoleIds },
      $or: [
        { projects: id },           // assigned via User.projects
        { _id: { $in: project.members } } // assigned via Project.members
      ]
    })
      .populate("role", "name permissions")
      .select("name email role");

    const approvers = assignedUsers.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      roleName: u.role?.name || "Member",
    }));

    return NextResponse.json(approvers);
  } catch (error) {
    console.error("Plan approvers error:", error);
    return NextResponse.json(
      { message: "Error fetching plan approvers", error: error.message },
      { status: 500 }
    );
  }
});
