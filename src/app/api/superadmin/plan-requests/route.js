import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PlanRequest from "@/models/PlanRequest";
import { withSuperAdmin } from "@/lib/superadminMiddleware";

// GET /api/superadmin/plan-requests
// List all requests, Pending first
const STATUS_ORDER = { Pending: 0, Approved: 1, Rejected: 2 };

export const GET = withSuperAdmin(async function () {
  await dbConnect();

  const requests = await PlanRequest.find({})
    .sort({ createdAt: -1 })
    .lean();

  // Stable sort: keeps createdAt desc within each status group
  requests.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return NextResponse.json(requests);
});
