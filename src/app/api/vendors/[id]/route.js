import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { withAuth } from "@/lib/middleware";

export const PUT = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
<<<<<<< HEAD
    const body = await req.json();

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId },
      { $set: body },
      { new: true, runValidators: true }
    );
=======
    const updateData = await req.json();

    const vendor = await Vendor.findOne({ _id: id, organization: req.user.organizationId });
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1

    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

<<<<<<< HEAD
    return NextResponse.json(vendor);
  } catch (error) {
=======
    const updatedVendor = await Vendor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error("PUT /api/vendors/[id] error:", error);
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
    return NextResponse.json({ message: "Error updating vendor" }, { status: 500 });
  }
});

export const DELETE = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

<<<<<<< HEAD
    const vendor = await Vendor.findOneAndDelete({ _id: id, organization: req.user.organizationId });
=======
    const vendor = await Vendor.findOne({ _id: id, organization: req.user.organizationId });
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1

    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

<<<<<<< HEAD
    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error) {
=======
    await Vendor.findByIdAndDelete(id);

    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/vendors/[id] error:", error);
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
    return NextResponse.json({ message: "Error deleting vendor" }, { status: 500 });
  }
});
