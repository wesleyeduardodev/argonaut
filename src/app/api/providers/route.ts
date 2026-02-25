import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskSecret } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();

    const providers = await prisma.aIProvider.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const masked = providers.map((p) => ({
      ...p,
      apiKey: maskSecret(decrypt(p.apiKey)),
    }));

    return NextResponse.json(masked);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get providers error:", error);
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
    const { name, provider, apiKey, defaultModel, isDefault } = body;

    if (!name || !provider || !apiKey || !defaultModel) {
      return NextResponse.json(
        { error: "name, provider, apiKey, and defaultModel are required" },
        { status: 400 }
      );
    }

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true, userId },
        data: { isDefault: false },
      });
    }

    const created = await prisma.aIProvider.create({
      data: {
        name,
        provider,
        apiKey: encrypt(apiKey),
        defaultModel,
        isDefault: isDefault || false,
        userId,
      },
    });

    return NextResponse.json(
      { ...created, apiKey: maskSecret(apiKey) },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A provider with this type already exists" },
        { status: 409 }
      );
    }
    console.error("Create provider error:", error);
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
    const { id, name, provider, apiKey, defaultModel, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.aIProvider.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true, NOT: { id }, userId },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (provider !== undefined) data.provider = provider;
    if (defaultModel !== undefined) data.defaultModel = defaultModel;
    if (isDefault !== undefined) data.isDefault = isDefault;
    if (apiKey && !apiKey.startsWith("****")) {
      data.apiKey = encrypt(apiKey);
    }

    const updated = await prisma.aIProvider.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...updated,
      apiKey: maskSecret(decrypt(updated.apiKey)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update provider error:", error);
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

    const deleted = await prisma.aIProvider.deleteMany({
      where: { id: Number(id), userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete provider error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
