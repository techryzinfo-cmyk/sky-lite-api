import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        url: String,
        type: { type: String, enum: ["image", "document"] },
        name: String,
      },
    ],
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Delete existing model if it exists to prevent OverwriteModelError in Next.js HMR
delete mongoose.models.ChatMessage;

export default mongoose.models.ChatMessage || mongoose.model("ChatMessage", ChatMessageSchema);
