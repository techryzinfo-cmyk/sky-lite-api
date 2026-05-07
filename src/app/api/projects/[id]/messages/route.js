import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import { withAuth } from "@/lib/middleware";
import { emitToProject } from "@/lib/socket-server";

export const GET = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id: projectId } = await params;
    
    const messages = await ChatMessage.find({ 
      project: projectId,
      organization: req.user.organizationId 
    })
    .sort({ createdAt: 1 })
    .limit(100); // Last 100 messages

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching messages", error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async function (req, { params }) {
  try {
    await dbConnect();
    const { id: projectId } = await params;
    const { content, attachments } = await req.json();

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ message: "Message content or attachment required" }, { status: 400 });
    }

    const messageData = {
      project: projectId,
      sender: req.user.id,
      senderName: req.user.name || "User",
      senderRole: req.user.role || "Member",
      content,
      attachments: attachments || [],
      organization: req.user.organizationId,
    };

    const message = await ChatMessage.create(messageData);

    // Broadcast message via socket
    emitToProject(projectId, 'chat:message', message);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error sending message", error: error.message }, { status: 500 });
  }
});
