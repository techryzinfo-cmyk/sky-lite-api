import mongoose from "mongoose";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function createSiteManager() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Import Organization and Role dynamically to ensure mongoose models are registered
    const { default: Organization } = await import("./src/models/Organization.js");
    const { default: Role } = await import("./src/models/Role.js");

    // Get the first default organization
    const org = await Organization.findOne();
    if (!org) {
      console.log("No organization found. Please run seed script first.");
      process.exit(1);
    }

    const roleData = {
      name: "Site Manager",
      description: "Manages site operations and surveys",
      organization: org._id,
      isSystemRole: false,
      permissions: [
        "sitesurvey:view",
        "sitesurvey:create",
        "sitesurvey:update",
        "sitesurvey:delete",
        "sitesurvey:approve",
        "site:view",
        "site:create",
        "site:update",
      ]
    };

    const existingRole = await Role.findOne({ name: "Site Manager", organization: org._id });
    if (existingRole) {
      console.log("Site Manager role already exists.");
      // optionally update permissions
      existingRole.permissions = roleData.permissions;
      await existingRole.save();
      console.log("Updated permissions for Site Manager.");
    } else {
      await Role.create(roleData);
      console.log("Site Manager role created successfully!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating role:", error);
    process.exit(1);
  }
}

createSiteManager();
