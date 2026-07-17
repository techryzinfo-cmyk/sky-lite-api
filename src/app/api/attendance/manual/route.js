import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Attendance from "@/models/Attendance";
import Project from "@/models/Project";
import User from "@/models/User";
import { withRole } from "@/lib/middleware";

export const POST = withRole(async function (req) {
  try {
    await dbConnect();
    const { projectId, userId, date } = await req.json();

    if (!projectId || !userId || !date) {
      return NextResponse.json({ message: "Project, user, and date are required." }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Check if an active record already exists for this date
    const existing = await Attendance.findOne({
      user: userId,
      attendanceDate: date
    });

    if (existing) {
      return NextResponse.json({ message: "User already has an attendance record for this date." }, { status: 400 });
    }

    // Default to a standard 8-hour shift for manual overrides
    const checkInTime = new Date(`${date}T09:00:00.000Z`);
    const checkOutTime = new Date(`${date}T17:00:00.000Z`);

    const attendance = new Attendance({
      organization: req.user.organizationId,
      project: projectId,
      user: userId,
      attendanceDate: date,
      checkInTime,
      checkOutTime,
      status: "Present",
      source: "Mobile",
      notes: "Manual Override by Admin",
      totalWorkHours: 8,
      siteDistanceInMeters: 0,
      withinAllowedRadius: true
    });

    await attendance.save();

    return NextResponse.json({ success: true, attendance }, { status: 201 });
  } catch (error) {
    console.error("POST /api/attendance/manual error:", error);
    return NextResponse.json({ message: "Error during manual attendance override" }, { status: 500 });
  }
}, ["Admin"]);
