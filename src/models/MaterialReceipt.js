import mongoose from "mongoose";

const MaterialReceiptSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivedByName: String,
    
    // Delivery Details
    vendorName: String,
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    linkedPurchase: { type: mongoose.Schema.Types.ObjectId, ref: "MaterialPurchase", required: true },
    challanNumber: String,
    invoiceNumber: String,
    
    items: [
      {
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
        quantity: { type: Number, required: true },
        unit: String,
      }
    ],
    commonNote: String,
    invoiceUrl: String,
    
    // Verification Workflow
    status: {
      type: String,
      enum: ["Pending Verification", "Verified", "Rejected"],
      default: "Pending Verification",
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

export default mongoose.models.MaterialReceipt || mongoose.model("MaterialReceipt", MaterialReceiptSchema);
