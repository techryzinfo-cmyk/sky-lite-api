import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { withRole } from "@/lib/middleware";

/**
 * PATCH: Update team member
 */
export const PATCH = withRole(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const { name, email, phoneNumber, roleId, projectIds, status } = await req.json();

    const user = await User.findOne({ _id: id, organization: req.user.organizationId });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (roleId) user.role = roleId;
    if (projectIds) user.projects = projectIds;
    if (status) user.status = status;

    // Add audit entry
    user.auditTrail.push({
      user: req.user.id,
      userName: req.user.name || "Admin",
      userRole: req.user.role || "Admin",
      action: "Update",
      details: "Member details updated by Administrator",
    });

    await user.save();

    const updatedUser = await User.findById(id)
      .populate("role", "name")
      .populate("projects", "name");

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ message: "Error updating member", error: error.message }, { status: 500 });
  }
}, ["Admin"]);

/**
 * DELETE: Remove team member
 */
export const DELETE = withRole(async function (req, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    // Security: Prevent self-deletion
    if (id === req.user.id) {
      return NextResponse.json({ message: "Forbidden: You cannot delete your own Administrator account" }, { status: 403 });
    }

    const user = await User.findOne({ _id: id, organization: req.user.organizationId });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Capture logout/removal event for audit logging if needed
    // Since we are deleting, we could record this in a dedicated AuditLog collection,
    // but for now we'll just proceed with removal.
    
    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error removing member", error: error.message }, { status: 500 });
  }
}, ["Admin"]);
