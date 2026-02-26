import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { url, token, existingId } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let authToken: string | undefined;

    if (existingId && !token) {
      const existing = await prisma.gitServer.findFirst({
        where: { id: existingId, userId },
      });
      if (existing) {
        authToken = decrypt(existing.token);
      }
    } else if (token) {
      authToken = token;
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "No valid credentials provided" },
        { status: 400 }
      );
    }

    const baseUrl = url.replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub returned ${res.status}: ${text.slice(0, 200)}` },
        { status: 400 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      message: `Connection successful! Authenticated as ${data.login}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Test git connection error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Connection failed: ${message}` },
      { status: 500 }
    );
  }
}
