import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async function (req) {
  try {
    await dbConnect();

    const vendors = await Vendor.find({ organization: req.user.organizationId }).sort({ createdAt: -1 });

    return NextResponse.json(vendors);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching vendors" }, { status: 500 });
  }
});

export const POST = withAuth(async function (req) {
  try {
    await dbConnect();
    const { name, contactPerson, email, phoneNumber, status } = await req.json();

    const vendor = new Vendor({
      name,
      contactPerson,
      email,
      phoneNumber,
      status: status || "Active",
      organization: req.user.organizationId,
    });

    await vendor.save();

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating vendor" }, { status: 500 });
  }
});
