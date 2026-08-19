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
<<<<<<< HEAD
=======
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
<<<<<<< HEAD
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
=======
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
<<<<<<< HEAD
=======
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
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

<<<<<<< HEAD
delete mongoose.models.Vendor;
=======
>>>>>>> 1f73ca6457811e653367302d385e3b712520dcd1
export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
