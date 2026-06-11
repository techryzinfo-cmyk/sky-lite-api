import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Role from "@/models/Role";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import OtpRegistration from "@/models/OtpRegistration";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();

    // Find the OTP record
    const otpRecord = await OtpRegistration.findOne({ email: lowerEmail });

    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid or expired OTP. Please register again." }, { status: 400 });
    }

    if (otpRecord.otp !== otp) {
      return NextResponse.json({ message: "Incorrect OTP" }, { status: 400 });
    }

    // Check if user already exists (double check)
    const userExists = await User.findOne({ email: lowerEmail });
    if (userExists) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const { name, password, phoneNumber } = otpRecord;

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
      email: lowerEmail,
      password, // Password is already hashed in OtpRegistration pre-save, wait - mongoose User.pre('save') will hash it again if it thinks it's modified.
      // Wait, User pre('save') hashes password if isModified. But if we pass hashed password, it'll double hash.
      phoneNumber,
      role: adminRole._id,
      organization: org._id,
    });
    
    // We need to bypass the User.pre('save') hashing if it's already hashed, 
    // OR we can just store raw password in OtpRegistration and let User handle it.
    // Since OtpRegistration hashes it, passing it here to User model will cause double hash.
    // Let's manually set the password field and mark it as not modified? No.
    // Instead of messing with Mongoose internals, it's safer to store raw password in OtpRegistration? 
    // Wait, storing raw password is bad practice even temporarily.
    // But since `otpRecord.password` is already hashed, we can use `User.create` or `insertMany` or update UserSchema, or simply overwrite the hash manually.
    // Actually, `OtpRegistration` `pre('save')` hashes it. When we create `User`, its `pre('save')` will hash it again.
    // Let's modify the way we pass password.
    // `user.password = password;`
    // Wait, `user.save()` will trigger the hash. We can temporarily skip validation/hooks or just not hash it in `OtpRegistration`. 
    // Let's assume we change `OtpRegistration` to not hash, or we just remove the `pre('save')` from `OtpRegistration`.
    // Let's fix that below by editing `OtpRegistration.js` to NOT hash the password.

    user.auditTrail.push({
      userName: name,
      userRole: "Admin",
      action: "Create",
      details: "Initial account registration via OTP — assigned Admin role",
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

    // 6. Delete OTP record
    await OtpRegistration.deleteOne({ email: lowerEmail });

    return NextResponse.json(
      {
        message: "Account created successfully",
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
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { message: "Error verifying OTP", error: error.message },
      { status: 500 }
    );
  }
}
