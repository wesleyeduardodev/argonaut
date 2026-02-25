import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import type { ChatMessageDTO } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const sessionId = Number(id);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const result: ChatMessageDTO[] = messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      id: session.id,
      title: session.title,
      provider: session.provider,
      model: session.model,
      messages: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const sessionId = Number(id);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { role, content, toolCalls } = body;

    if (!role || content === undefined) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 }
      );
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          role,
          content,
          toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
          sessionId,
        },
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
