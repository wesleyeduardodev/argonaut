import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskSecret } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";

function maskServer(server: {
  id: number;
  name: string;
  platform: string;
  url: string;
  token: string;
  defaultOwner: string | null;
  isDefault: boolean;
  createdAt: Date;
  userId: number;
}) {
  return {
    ...server,
    token: maskSecret(decrypt(server.token)),
  };
}

export async function GET() {
  try {
    const userId = await getUserId();

    const servers = await prisma.gitServer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(servers.map(maskServer));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get git servers error:", error);
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
    const { name, platform, url, token, defaultOwner, isDefault } = body;

    if (!name || !platform || !url || !token) {
      return NextResponse.json(
        { error: "name, platform, url, and token are required" },
        { status: 400 }
      );
    }

    if (isDefault) {
      await prisma.gitServer.updateMany({
        where: { isDefault: true, userId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.gitServer.create({
      data: {
        name,
        platform,
        url: url.replace(/\/+$/, ""),
        token: encrypt(token),
        defaultOwner: defaultOwner || null,
        isDefault: isDefault || false,
        userId,
      },
    });

    return NextResponse.json(maskServer(created), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create git server error:", error);
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
    const { id, name, platform, url, token, defaultOwner, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.gitServer.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.gitServer.updateMany({
        where: { isDefault: true, NOT: { id }, userId },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (platform !== undefined) data.platform = platform;
    if (url !== undefined) data.url = url.replace(/\/+$/, "");
    if (defaultOwner !== undefined) data.defaultOwner = defaultOwner || null;
    if (isDefault !== undefined) data.isDefault = isDefault;

    if (token && !token.startsWith("****")) data.token = encrypt(token);

    const updated = await prisma.gitServer.update({
      where: { id },
      data,
    });

    return NextResponse.json(maskServer(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update git server error:", error);
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

    const deleted = await prisma.gitServer.deleteMany({
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
    console.error("Delete git server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
