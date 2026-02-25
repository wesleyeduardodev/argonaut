import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskSecret } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";

function maskServer(server: {
  id: number;
  name: string;
  url: string;
  authType: string;
  token: string | null;
  username: string | null;
  password: string | null;
  insecure: boolean;
  isDefault: boolean;
  createdAt: Date;
  userId: number;
}) {
  return {
    ...server,
    token: server.token ? maskSecret(decrypt(server.token)) : null,
    username: server.username ? decrypt(server.username) : null,
    password: server.password ? maskSecret(decrypt(server.password)) : null,
  };
}

export async function GET() {
  try {
    const userId = await getUserId();

    const servers = await prisma.argoServer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(servers.map(maskServer));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get argo servers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { name, url, authType, token, username, password, insecure, isDefault } = body;

    if (!name || !url || !authType) {
      return NextResponse.json(
        { error: "name, url, and authType are required" },
        { status: 400 }
      );
    }

    if (authType === "token" && !token) {
      return NextResponse.json(
        { error: "token is required for token auth" },
        { status: 400 }
      );
    }

    if (authType === "userpass" && (!username || !password)) {
      return NextResponse.json(
        { error: "username and password are required for userpass auth" },
        { status: 400 }
      );
    }

    if (isDefault) {
      await prisma.argoServer.updateMany({
        where: { isDefault: true, userId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.argoServer.create({
      data: {
        name,
        url: url.replace(/\/+$/, ""),
        authType,
        token: token ? encrypt(token) : null,
        username: username ? encrypt(username) : null,
        password: password ? encrypt(password) : null,
        insecure: insecure || false,
        isDefault: isDefault || false,
        userId,
      },
    });

    return NextResponse.json(maskServer(created), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create argo server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { id, name, url, authType, token, username, password, insecure, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.argoServer.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.argoServer.updateMany({
        where: { isDefault: true, NOT: { id }, userId },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url.replace(/\/+$/, "");
    if (authType !== undefined) data.authType = authType;
    if (insecure !== undefined) data.insecure = insecure;
    if (isDefault !== undefined) data.isDefault = isDefault;

    if (token && !token.startsWith("****")) data.token = encrypt(token);
    if (username) data.username = encrypt(username);
    if (password && !password.startsWith("****")) data.password = encrypt(password);

    const updated = await prisma.argoServer.update({
      where: { id },
      data,
    });

    return NextResponse.json(maskServer(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update argo server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await prisma.argoServer.deleteMany({
      where: { id: Number(id), userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete argo server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
