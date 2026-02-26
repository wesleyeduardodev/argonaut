import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const serverId = Number(id);

    const server = await prisma.gitServer.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const token = decrypt(server.token);
    const baseUrl = server.url.replace(/\/+$/, "");

    const start = Date.now();
    const res = await fetch(`${baseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const latency = Date.now() - start;

    return NextResponse.json({
      status: res.ok ? "connected" : "error",
      latency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Git health check error:", error);
    return NextResponse.json({ status: "error", latency: 0 });
  }
}
