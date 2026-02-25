import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";
import { ArgoClient } from "@/lib/argocd/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const serverId = Number(id);

    const server = await prisma.argoServer.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const argoConfig = {
      url: server.url,
      authType: server.authType as "token" | "userpass",
      token: server.token ? decrypt(server.token) : undefined,
      username: server.username ? decrypt(server.username) : undefined,
      password: server.password ? decrypt(server.password) : undefined,
      insecure: server.insecure,
    };

    const client = new ArgoClient(argoConfig);
    const { ok, latency } = await client.ping();

    return NextResponse.json({
      status: ok ? "connected" : "error",
      latency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Health check error:", error);
    return NextResponse.json({ status: "error", latency: 0 });
  }
}
