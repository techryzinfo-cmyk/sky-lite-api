import { NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";
import dbConnect from "./db";
import User from "@/models/User";

/**
 * Higher Order Function to protect API routes
 */
export const withAuth = (handler) => {
  return async (req, ...args) => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 });
      }

      const token = authHeader.split(" ")[1];
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        console.log("[withAuth] Token verification failed for header:", authHeader?.substring(0, 20) + "...");
        return NextResponse.json({ message: "Unauthorized: Invalid or expired token" }, { status: 401 });
      }

      // Attach user info to request (optional if you need it in handler)
      req.user = decoded;

      return handler(req, ...args);
    } catch (error) {
      return NextResponse.json({ message: "Authentication error", error: error.message }, { status: 500 });
    }
  };
};

/**
 * Higher Order Function for Role-based protection
 */
export const withRole = (handler, allowedRoles) => {
  return withAuth(async (req, ...args) => {
    // Admin role bypasses all permission checks
    if (req.user.role === "Admin" || (allowedRoles && allowedRoles.includes(req.user.role))) {
      return handler(req, ...args);
    }

    return NextResponse.json({ message: "Forbidden: You do not have permission" }, { status: 403 });
  });
};

/**
 * Higher Order Function for granular module:action permission checks
 * Admin role always bypasses. Non-admins must have the specific permission or "*".
 */
export const withPermission = (handler, permission) => {
  return withAuth(async (req, ...args) => {
    if (req.user.role === "Admin") return handler(req, ...args);
    try {
      await dbConnect();
      const userWithRole = await User.findById(req.user.id).populate("role").select("role");
      const perms = userWithRole?.role?.permissions || [];
      if (!perms.includes("*") && !perms.includes(permission)) {
        return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
      }
      return handler(req, ...args);
    } catch (error) {
      return NextResponse.json({ message: "Permission check error", error: error.message }, { status: 500 });
    }
  });
};
