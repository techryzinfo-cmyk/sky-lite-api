import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Role from "@/models/Role";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // 1. Create Organization for this admin (placeholder owner, updated below)
    const org = await Organization.create({
      name: `${name}'s Workspace`,
      owner: new mongoose.Types.ObjectId(),
    });

    // 2. Create Admin Role scoped to this organization
    const adminRole = await Role.create({
      name: "Admin",
      permissions: ["*"],
      isSystemRole: true,
      organization: org._id,
    });

    // 3. Create user with org and role assigned
    const user = new User({
      name,
      email,
      password,
      role: adminRole._id,
      organization: org._id,
    });

    user.auditTrail.push({
      userName: name,
      userRole: "Admin",
      action: "Create",
      details: "Initial account registration — assigned Admin role",
    });

    await user.save();

    // 4. Update org owner to the real user _id
    org.owner = user._id;

    // 5. Auto-create a 14-day Silver trial subscription for the new org
    const sub = new Subscription({ organization: org._id });
    sub.applyPlanDefaults();
    sub.history.push({ plan: "Silver", status: "Trial", changedBy: "System", reason: "Account registration" });
    await sub.save();
    org.subscription = sub._id;

    await org.save();

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: adminRole.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Error registering user", error: error.message },
      { status: 500 }
    );
  }
}
