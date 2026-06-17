import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Attendance from "@/models/Attendance";
import { withAuth } from "@/lib/middleware";
import User from "@/models/User";
import * as XLSX from "xlsx";

export const GET = withAuth(async function (req) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const startDate = url.searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = url.searchParams.get("endDate"); // YYYY-MM-DD
    const exportUserId = url.searchParams.get("userId");
    
    if (!projectId || !startDate || !endDate) {
      return NextResponse.json({ message: "Missing required query parameters: projectId, startDate, endDate" }, { status: 400 });
    }

    const userDoc = await User.findById(req.user.id).populate("role");
    const isAdmin = userDoc?.role?.name === "Admin" || req.user.role === "Admin";

    const query = {
      project: projectId,
      organization: req.user.organizationId,
      attendanceDate: { $gte: startDate, $lte: endDate }
    };

    if (!isAdmin) {
      query.user = req.user.id;
    } else if (exportUserId) {
      query.user = exportUserId;
    }

    const records = await Attendance.find(query).populate("user").sort({ attendanceDate: 1 });

    // Format data for Excel
    const excelData = records.map(rec => ({
      Date: rec.attendanceDate,
      Name: rec.user?.name || rec.user?.email || "Unknown",
      "Check-In": new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      "Check-Out": rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending",
      "Total Hours": rec.totalWorkHours || "-"
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    // Write to buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Attendance_Export_${startDate}_to_${endDate}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("GET /api/attendance/export error:", error);
    return NextResponse.json({ message: "Error exporting attendance" }, { status: 500 });
  }
});
