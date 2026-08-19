import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { withAuth } from "@/lib/middleware";

export const PUT = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ message: "Error updating vendor" }, { status: 500 });
  }
});

export const DELETE = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const vendor = await Vendor.findOneAndDelete({ _id: id, organization: req.user.organizationId });

    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting vendor" }, { status: 500 });
  }
});
