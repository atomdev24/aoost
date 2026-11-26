import { z } from "zod";
import { diffSite } from "../model/ops";
import { tools, toolByName, runTool, type ToolContext } from "../mcp/tools";
import { problemsReport } from "../model/problems";
import { DESIGN_WIDTH, validateSite, type Breakpoint } from "../schema";
import { draftStub, readDraft, type Env } from "./env";
import { extOf, MAX_UPLOAD, MEDIA_TYPES, storeMedia } from "./media";
import { publishToGitHub } from "./publish";
import { screenshot } from "./screenshot";

/**
 * A remote MCP server over streamable HTTP (SPEC §8), stateless: every POST
 * carries one JSON-RPC message (or a batch) and gets a JSON answer. Auth is
 * done before this is reached (bearer token now, Cloudflare Access later).
 */
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER = { name: "aoost-cms", title: "aoost site editor", version: "1.0.0" };
const INSTRUCTIONS =
  "Tools for editing Alex's site, aoost. Every tool changes the DRAFT only; the open editor shows changes live and Alex can undo them. " +
  "Start with get_editor_context to see the page and selection Alex means, and get_site for theme tokens and component types. " +
  "The base layout is mobile (390px); desktop stores only overrides (set_responsive_override). Check mobile first. " +
  "Never call publish unless Alex explicitly asks you to publish in the chat. " +
  "Alex watches the editor while you work: call set_status with what you're doing at each step (and node_ids for the blocks), and set_status done: true with a summary at the end. " +
  "Comments that tag @Claude are tasks for you: get_claude_tasks lists them; reply_to_comment (resolve) when each is done.";

/** "@Claude" (any case) in a comment makes it a task for Claude. */
export const CLAUDE_TAG = /(^|\s)@claude\b/i;

/** What a tool call looks like to someone watching the editor. */
export function describeTool(name: string): string {
  if (name === "get_page" || name === "list_pages" || name === "get_site" || name === "get_node" || name === "get_editor_context") return "Reading the site";
  if (name === "get_comments" || name === "get_claude_tasks") return "Reading comments";
  if (name === "get_preview_screenshot") return "Looking at the page";
  if (name === "reply_to_comment") return "Replying to a comment";
  if (name === "publish") return "Publishing";
  if (name.startsWith("add_")) return "Adding to the page";
  if (name === "update_node" || name === "set_responsive_override") return "Changing a block";
  if (name === "move_node") return "Moving a block";
  if (name === "delete_node") return "Removing a block";
  if (name === "create_page") return "Making a page";
  if (name === "update_page_settings") return "Changing page settings";
  if (name === "update_nav") return "Updating the navigation";
  if (name === "upload_media_from_url") return "Adding a picture";
  return "Working";
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
type CallResult = { content: Content[]; isError?: boolean };

const result = (id: Rpc["id"], value: unknown) => ({ jsonrpc: "2.0" as const, id, result: value });
const rpcError = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0" as const, id: id ?? null, error: { code, message } });
const text = (t: string, isError = false): CallResult => ({ content: [{ type: "text", text: t }], ...(isError ? { isError: true } : {}) });

export const toolList = () =>
  tools.map((t) => {
    const { $schema: _schema, ...inputSchema } = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>;
    return { name: t.name, description: t.description, inputSchema };
  });

async function callTool(name: string, args: Record<string, unknown>, env: Env, origin: string): Promise<CallResult> {
  const tool = toolByName(name);
  if (!tool) return text(`Unknown tool "${name}".`, true);
  const parsed = tool.input.safeParse(args ?? {});
  if (!parsed.success) return text(`Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`, true);
  const draft = draftStub(env);
  // Every call shows in the open editors: "Claude is working · Updating a block".
  if (name !== "set_status") {
    const a = parsed.data as { page?: unknown; node_id?: unknown };
    await draft.agentStatus({ state: "working", text: describeTool(name), ...(typeof a.page === "string" ? { pageId: a.page } : {}), ...(typeof a.node_id === "string" ? { nodeIds: [a.node_id] } : {}) }).catch(() => {});
  }

  if (name === "set_status") {
    const a = parsed.data as { text: string; done: boolean; page?: string; node_ids?: string[] };
    await draft.agentStatus({ state: a.done ? "done" : "working", text: a.text, ...(a.page ? { pageId: a.page } : {}), ...(a.node_ids?.length ? { nodeIds: a.node_ids } : {}) });
    return text("Shown in the editor.");
  }

  if (name === "get_claude_tasks") {
    const a = parsed.data as { page?: string };
    const tasks = (await draft.getComments()).filter((t) => t.status === "open" && (!a.page || t.pageId === a.page) && t.messages.some((m) => CLAUDE_TAG.test(m.text)));
    if (!tasks.length) return text("No open @Claude tasks.");
    return text(
      tasks
        .map((t) => [`${t.id} · page ${t.pageId} · block ${t.nodeId} ("${t.label}") · ${t.bp}`, ...t.messages.map((m) => `  ${m.by.name}: ${m.text}`)].join("\n"))
        .join("\n\n"),
    );
  }

  if (name === "get_problem_log") {
    const a = parsed.data as { limit: number; kind?: string };
    const items = (await draft.getProblems()).filter((p) => !a.kind || p.kind === a.kind);
    return text(problemsReport(items, a.limit));
  }

  if (name === "get_comments") {
    const a = parsed.data as { status: "open" | "resolved" | "all"; page?: string };
    const list = (await draft.getComments()).filter((t) => (a.status === "all" || t.status === a.status) && (!a.page || t.pageId === a.page));
    if (!list.length) return text(a.status === "open" ? "No open comments." : "No comments.");
    const day = (n: number) => new Date(n).toISOString().replace("T", " ").slice(0, 16);
    return text(
      list
        .map((t) =>
          [
            `${t.id} · ${t.status} · page ${t.pageId} · block ${t.nodeId}${t.path ? ` ${JSON.stringify(t.path)}` : ""} · "${t.label}" · ${t.bp}`,
            ...[...t.messages.map((m) => ({ at: m.at, line: `  ${day(m.at)} ${m.by.name}: ${m.text}` })), ...t.events.map((e) => ({ at: e.at, line: `  ${day(e.at)} (${e.by} · ${e.text}${e.count > 1 ? ` ×${e.count}` : ""})` }))]
              .sort((x, y) => x.at - y.at)
              .map((x) => x.line),
          ].join("\n"),
        )
        .join("\n\n"),
    );
  }

  if (name === "reply_to_comment") {
    const a = parsed.data as { id: string; text: string; resolve: boolean };
    const by = { name: "Claude", color: "#D97757" };
    const reply = await draft.commentOp(JSON.stringify({ op: "reply", id: a.id, msgId: "m-" + crypto.randomUUID().slice(0, 12), by, text: a.text }), "claude");
    if (!reply.ok) return text(reply.error, true);
    if (a.resolve) {
      const done = await draft.commentOp(JSON.stringify({ op: "resolve", id: a.id, by }), "claude");
      if (!done.ok) return text(done.error, true);
    }
    return text(a.resolve ? "Replied and resolved." : "Replied.");
  }

  if (name === "upload_media_from_url") {
    const a = parsed.data as { url: string; name?: string };
    const url = new URL(a.url);
    if (url.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/.test(url.hostname)) return text("Only public https URLs can be fetched.", true);
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return text(`Could not fetch that URL (${res.status}).`, true);
    const length = Number(res.headers.get("Content-Length") ?? 0);
    if (length > MAX_UPLOAD) return text("That file is over 95 MB.", true);
    let fileName = a.name ?? decodeURIComponent(url.pathname.split("/").pop() || "file");
    if (!MEDIA_TYPES[extOf(fileName)]) {
      // No usable extension in the URL: take it from the content type.
      const type = (res.headers.get("Content-Type") ?? "").split(";")[0]!.trim();
      const ext = Object.entries(MEDIA_TYPES).find(([, v]) => v.mime === type)?.[0];
      if (!ext) return text(`Unsupported file type (${type || "unknown"}). Pass a name with an extension such as .jpg, .png, .mp4, .pdf.`, true);
      fileName = `${fileName.replace(/\.[^.]*$/, "")}.${ext}`;
    }
    const body = await res.arrayBuffer();
    try {
      const item = await storeMedia(env, { name: fileName, body, size: body.byteLength });
      return text(JSON.stringify({ url: item.url, name: item.name, kind: item.kind, bytes: item.size, note: "Use this url as the src of an Image, Video, Audio, FileDownload, Lottie or Model3D node." }));
    } catch (e) {
      return text(e instanceof Error ? e.message : "Upload failed.", true);
    }
  }

  if (name === "get_preview_screenshot") {
    const a = parsed.data as { page?: string; breakpoint: Breakpoint };
    const { site } = await readDraft(env);
    const state = await draft.state();
    const page = site.pages.find((p) => p.id === a.page || p.slug === a.page) ?? site.pages.find((p) => p.id === state.context?.pageId) ?? site.pages.find((p) => p.isHome)!;
    const shot = await screenshot(env, page, a.breakpoint);
    if (!shot.ok) return text(shot.error, true);
    return { content: [{ type: "image", data: shot.png, mimeType: "image/png" }, { type: "text", text: `Draft of ${page.title} (${page.slug}) at ${DESIGN_WIDTH[a.breakpoint]}px, captured by ${shot.via}.` }] };
  }

  if (name === "publish") {
    if (!env.GITHUB_TOKEN) return text("Publishing is not set up yet (GITHUB_TOKEN is missing). Alex can publish from the editor once it is.", true);
    const a = parsed.data as { message?: string };
    const published = await publishToGitHub(await draft.getFiles(), { repo: env.GITHUB_REPO, branch: env.PUBLISH_BRANCH, token: env.GITHUB_TOKEN, message: a.message });
    if (!published.ok) return text(published.error, true);
    await draft.markPublished();
    return text(published.commit ? `Published ${published.changed.length} file(s). The site rebuilds and deploys in about a minute. Commit: ${published.url}` : "Nothing to publish: the draft matches what is live.");
  }

  // Everything else is a pure function of the draft.
  const [{ site }, state] = await Promise.all([readDraft(env), draft.state()]);
  const ctx: ToolContext = { site, editor: state.context && state.editors > 0 ? state.context : null };
  const out = runTool(name, args, ctx);
  if (out.isError || !out.site) return text(out.text, out.isError);
  const checked = validateSite(out.site);
  if (!checked.ok) return text(`That change would make the site invalid, so nothing was changed: ${checked.issues.slice(0, 5).map((i) => `${i.path}: ${i.message}`).join("; ")}`, true);
  const ops = diffSite(site, out.site);
  if (!ops.length) return text(`${out.text} (No change was needed.)`);
  const applied = await draft.apply(JSON.stringify(ops), origin, out.summary, out.changed);
  if (!applied.ok) return text(`The draft store rejected the change: ${applied.issues.slice(0, 5).map((i) => `${i.path}: ${i.message}`).join("; ")}`, true);
  return text(`${out.text}\n(Draft updated${state.editors > 0 ? "; it is showing in Alex's editor now" : ""}. Not published.)`);
}

async function handleMessage(msg: Rpc, env: Env): Promise<object | null> {
  if (msg?.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid JSON-RPC request.");
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case "initialize": {
      const wanted = String(msg.params?.protocolVersion ?? "");
      return result(msg.id, { protocolVersion: PROTOCOL_VERSIONS.includes(wanted) ? wanted : PROTOCOL_VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: INSTRUCTIONS });
    }
    case "ping":
      return result(msg.id, {});
    case "tools/list":
      return result(msg.id, { tools: toolList() });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      try {
        return result(msg.id, await callTool(name, (msg.params?.arguments ?? {}) as Record<string, unknown>, env, "mcp"));
      } catch (e) {
        console.error(e);
        return result(msg.id, text(`The tool failed: ${e instanceof Error ? e.message : "unknown error"}`, true));
      }
    }
    case "resources/list":
      return result(msg.id, { resources: [] });
    case "prompts/list":
      return result(msg.id, { prompts: [] });
    default:
      return isNotification ? null : rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function mcp(request: Request, env: Env): Promise<Response> {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (request.method === "GET" || request.method === "DELETE") {
    // No server-initiated stream and no sessions to end: this server is stateless.
    return new Response(JSON.stringify(rpcError(null, -32000, "This MCP endpoint answers POST requests only.")), { status: 405, headers: { ...headers, Allow: "POST" } });
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "Could not parse JSON.")), { status: 400, headers });
  }
  if (Array.isArray(body)) {
    const answers = (await Promise.all(body.map((m) => handleMessage(m as Rpc, env)))).filter(Boolean);
    return answers.length ? new Response(JSON.stringify(answers), { headers }) : new Response(null, { status: 202 });
  }
  const answer = await handleMessage(body as Rpc, env);
  return answer ? new Response(JSON.stringify(answer), { headers }) : new Response(null, { status: 202 });
}
