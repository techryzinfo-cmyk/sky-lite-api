import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a vendor name"],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

delete mongoose.models.Vendor;
export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
