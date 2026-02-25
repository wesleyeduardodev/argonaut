import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createAIProvider } from "@/lib/ai/provider-factory";
import { ArgoClient } from "@/lib/argocd/client";
import { executeTool } from "@/lib/tools/executor";
import type { ToolCall } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { messages, providerId, model, argoServerId } = body;

    if (!messages || !providerId || !model || !argoServerId) {
      return new Response(
        JSON.stringify({ error: "messages, providerId, model, and argoServerId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch provider and server configs
    const [providerRecord, serverRecord] = await Promise.all([
      prisma.aIProvider.findUnique({ where: { id: Number(providerId) } }),
      prisma.argoServer.findUnique({ where: { id: Number(argoServerId) } }),
    ]);

    if (!providerRecord) {
      return new Response(
        JSON.stringify({ error: "AI Provider not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!serverRecord) {
      return new Response(
        JSON.stringify({ error: "ArgoCD Server not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Decrypt credentials
    const apiKey = decrypt(providerRecord.apiKey);
    const argoConfig = {
      url: serverRecord.url,
      authType: serverRecord.authType as "token" | "userpass",
      token: serverRecord.token ? decrypt(serverRecord.token) : undefined,
      username: serverRecord.username ? decrypt(serverRecord.username) : undefined,
      password: serverRecord.password ? decrypt(serverRecord.password) : undefined,
      insecure: serverRecord.insecure,
    };

    // Create clients
    const aiProvider = createAIProvider(providerRecord.provider, apiKey, model);
    const argoClient = new ArgoClient(argoConfig);

    // SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        try {
          await aiProvider.chat(
            messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            (event) => {
              switch (event.type) {
                case "text":
                  send("text", { text: event.text });
                  break;
                case "tool_call":
                  send("tool_call_start", {
                    id: event.toolCall.id,
                    name: event.toolCall.name,
                    input: event.toolCall.input,
                  });
                  break;
                case "done":
                  send("done", {});
                  break;
              }
            },
            async (toolCall: ToolCall) => {
              const result = await executeTool(
                argoClient,
                toolCall.name,
                toolCall.input
              );
              send("tool_call_result", {
                id: toolCall.id,
                name: toolCall.name,
                output: result,
              });
              return result;
            }
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          send("error", { error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
