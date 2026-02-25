import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, authType, token, username, password, insecure, existingId } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let authToken: string | undefined;

    // If editing existing and no new credentials provided, use stored ones
    if (existingId && !token && !password) {
      const existing = await prisma.argoServer.findUnique({
        where: { id: existingId },
      });
      if (existing) {
        if (existing.authType === "token" && existing.token) {
          authToken = decrypt(existing.token);
        } else if (existing.authType === "userpass" && existing.username && existing.password) {
          authToken = await loginToArgo(
            url,
            decrypt(existing.username),
            decrypt(existing.password),
            insecure
          );
        }
      }
    } else if (authType === "token" && token) {
      authToken = token;
    } else if (authType === "userpass" && username && password) {
      authToken = await loginToArgo(url, username, password, insecure);
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "No valid credentials provided" },
        { status: 400 }
      );
    }

    // Test connection by listing applications
    const baseUrl = url.replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/api/v1/applications?fields=items.metadata.name`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      ...(insecure
        ? { next: { revalidate: 0 } }
        : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `ArgoCD returned ${res.status}: ${text.slice(0, 200)}` },
        { status: 400 }
      );
    }

    const data = await res.json();
    const count = data.items?.length || 0;

    return NextResponse.json({
      message: `Connection successful! Found ${count} application(s).`,
    });
  } catch (error) {
    console.error("Test connection error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Connection failed: ${message}` },
      { status: 500 }
    );
  }
}

async function loginToArgo(
  url: string,
  username: string,
  password: string,
  insecure: boolean
): Promise<string> {
  const baseUrl = url.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/api/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(`ArgoCD login failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token;
}
