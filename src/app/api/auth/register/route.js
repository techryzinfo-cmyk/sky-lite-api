import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import OtpRegistration from "@/models/OtpRegistration";
import { sendEmail } from "@/lib/email";
import { otpEmail } from "@/lib/emailTemplates";

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, phoneNumber } = await req.json();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in OtpRegistration (upsert to handle if they try again)
    await OtpRegistration.findOneAndUpdate(
      { email },
      { name, email, password, phoneNumber, otp, createdAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send email
    await sendEmail({
      to: email,
      subject: "Your Registration OTP - Skystruct App",
      html: otpEmail({ name, otp }),
    });

    return NextResponse.json(
      {
        message: "OTP sent successfully to email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Registration initiation error:", error);
    return NextResponse.json(
      { message: "Error initiating registration", error: error.message },
      { status: 500 }
    );
  }
}
