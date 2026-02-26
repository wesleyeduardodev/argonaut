import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getUserId } from "@/lib/auth";
import { createAIProvider } from "@/lib/ai/provider-factory";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { ArgoClient } from "@/lib/argocd/client";
import { executeTool } from "@/lib/tools/executor";
import type { ToolContext } from "@/lib/tools/executor";
import type { OnToolProgress } from "@/lib/tools/executor";
import { getAllTools } from "@/lib/tools/definitions";
import { getSuggestions } from "@/lib/tools/suggestions";
import { createGitProvider } from "@/lib/git/client-factory";
import type { GitProvider } from "@/lib/git/types";
import type { ToolCall } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache for app context per user:server
const appCache = new Map<string, { data: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCachedApps(key: string): string | null {
  const entry = appCache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  appCache.delete(key);
  return null;
}

async function getAppContext(argoClient: ArgoClient, cacheKey: string): Promise<string | undefined> {
  const cached = getCachedApps(cacheKey);
  if (cached) return cached;

  try {
    const apps = await argoClient.listApplications() as Array<{
      name: string;
      syncStatus: string;
      healthStatus: string;
    }>;

    if (!apps || apps.length === 0) return undefined;

    const lines = apps.map(
      (a) => `- ${a.name} (${a.syncStatus || "Unknown"}/${a.healthStatus || "Unknown"})`
    );
    const context = lines.join("\n");

    appCache.set(cacheKey, { data: context, expires: Date.now() + CACHE_TTL });
    return context;
  } catch {
    // If we can't fetch apps, proceed without context
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const userId = await getUserId();
    const body = await request.json();
    const { messages, providerId, model, argoServerId, gitServerId } = body;

    if (!messages || !providerId || !model || !argoServerId) {
      return new Response(
        JSON.stringify({ error: "messages, providerId, model, and argoServerId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch provider and server configs (scoped to user)
    const [providerRecord, serverRecord, gitServerRecord] = await Promise.all([
      prisma.aIProvider.findFirst({ where: { id: Number(providerId), userId } }),
      prisma.argoServer.findFirst({ where: { id: Number(argoServerId), userId } }),
      gitServerId
        ? prisma.gitServer.findFirst({ where: { id: Number(gitServerId), userId } })
        : null,
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

    if (gitServerId && !gitServerRecord) {
      return new Response(
        JSON.stringify({ error: "Git Server not found" }),
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
    const argoClient = new ArgoClient(argoConfig);

    let gitClient: GitProvider | undefined;
    let gitDefaultOwner: string | undefined;
    if (gitServerRecord) {
      const gitConfig = {
        platform: gitServerRecord.platform,
        url: gitServerRecord.url,
        token: decrypt(gitServerRecord.token),
        defaultOwner: gitServerRecord.defaultOwner || undefined,
      };
      gitClient = createGitProvider(gitConfig);
      gitDefaultOwner = gitConfig.defaultOwner;
    }

    // Build tools list
    const tools = getAllTools({ git: !!gitClient });

    // Create AI provider with tools
    const aiProvider = createAIProvider(providerRecord.provider, apiKey, model, tools);

    // Fetch app context for system prompt (cached)
    const cacheKey = `${userId}:${argoServerId}`;
    const appContext = await getAppContext(argoClient, cacheKey);
    const systemPrompt = buildSystemPrompt({
      appContext,
      gitEnabled: !!gitClient,
      gitDefaultOwner,
    });

    // Build tool context
    const toolContext: ToolContext = { argoClient, gitClient };

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
              const onProgress: OnToolProgress = (progress) => {
                send("tool_call_progress", {
                  id: toolCall.id,
                  progress,
                });
              };
              const result = await executeTool(
                toolContext,
                toolCall.name,
                toolCall.input,
                onProgress
              );
              const suggestions = getSuggestions(toolCall.name);
              send("tool_call_result", {
                id: toolCall.id,
                name: toolCall.name,
                output: result,
                ...(suggestions.length > 0 && { suggestions }),
              });
              return result;
            },
            systemPrompt
          );
        } catch (error) {
          let message = "Unknown error";
          if (error instanceof Error) {
            message = error.message;
            // Try to extract nested API error messages
            try {
              const match = error.message.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed?.error?.message) message = parsed.error.message;
              }
            } catch { /* use original message */ }
          }
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
