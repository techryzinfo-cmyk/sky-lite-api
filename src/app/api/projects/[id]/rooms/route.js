import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async function () {
  return NextResponse.json([]);
});
