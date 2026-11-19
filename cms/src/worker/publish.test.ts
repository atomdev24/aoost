import { describe, expect, it } from "vitest";
import { buildStatus, publishToGitHub } from "./publish";

type Call = { method: string; path: string; body?: Record<string, unknown> };

/** A tiny fake of the GitHub git-data API. */
function fakeGitHub(existing: Record<string, string>, opts: { failOn?: string; status?: number } = {}) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.github.com/repos/o/r", "");
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined;
    calls.push({ method, path, body });
    if (opts.failOn && path.startsWith(opts.failOn)) return new Response("nope", { status: opts.status ?? 500 });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
    if (path === "/git/ref/heads/cms-v1") return json({ object: { sha: "head1" } });
    if (path === "/git/commits/head1") return json({ tree: { sha: "tree1" } });
    if (path.startsWith("/git/trees/tree1")) return json({ truncated: false, tree: [{ path: "index.html", type: "blob", sha: "x" }, ...Object.entries(existing).map(([p, sha]) => ({ path: p, type: "blob", sha }))] });
    if (path === "/git/trees" && method === "POST") return json({ sha: "tree2" });
    if (path === "/git/commits" && method === "POST") return json({ sha: "commit2", html_url: "https://github.com/o/r/commit/commit2" });
    if (path === "/git/refs/heads/cms-v1" && method === "PATCH") return json({});
    return new Response("unexpected", { status: 500 });
  };
  return { calls, fetcher };
}

const opts = (fetcher: ReturnType<typeof fakeGitHub>["fetcher"]) => ({ repo: "o/r", branch: "cms-v1", token: "t", fetcher });
// git blob sha of "hello\n"
const HELLO_SHA = "ce013625030ba8dba906f756967f9e9ca394464a";

describe("publish (commit through the GitHub API)", () => {
  it("commits changed, new and deleted content files in one commit", async () => {
    const gh = fakeGitHub({ "content/site.json": "old", "content/pages/gone.json": "y", "content/pages/same.json": HELLO_SHA });
    const result = await publishToGitHub({ "content/site.json": "{}\n", "content/pages/new.json": "{}\n", "content/pages/same.json": "hello\n" }, opts(gh.fetcher));
    expect(result).toMatchObject({ ok: true, commit: "commit2", changed: ["content/site.json", "content/pages/new.json", "content/pages/gone.json"] });
    const tree = gh.calls.find((c) => c.path === "/git/trees" && c.method === "POST")!.body as { base_tree: string; tree: { path: string; sha?: null; content?: string }[] };
    expect(tree.base_tree).toBe("tree1");
    expect(tree.tree.map((e) => e.path)).toEqual(["content/site.json", "content/pages/new.json", "content/pages/gone.json"]);
    expect(tree.tree[2]).toMatchObject({ sha: null });
    const commit = gh.calls.find((c) => c.path === "/git/commits" && c.method === "POST")!.body!;
    expect(commit).toMatchObject({ parents: ["head1"], tree: "tree2", message: "Publish from the editor: 3 files" });
    expect(gh.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/git/refs/heads/cms-v1", body: { sha: "commit2", force: false } });
  });
  it("never touches files outside content/", async () => {
    const gh = fakeGitHub({});
    await publishToGitHub({ "content/site.json": "{}\n" }, opts(gh.fetcher));
    const tree = gh.calls.find((c) => c.path === "/git/trees" && c.method === "POST")!.body as { tree: { path: string }[] };
    expect(tree.tree.every((e) => e.path.startsWith("content/"))).toBe(true);
  });
  it("makes no commit when nothing changed", async () => {
    const gh = fakeGitHub({ "content/a.json": HELLO_SHA });
    const result = await publishToGitHub({ "content/a.json": "hello\n" }, opts(gh.fetcher));
    expect(result).toEqual({ ok: true, commit: null, url: null, changed: [] });
    expect(gh.calls.every((c) => c.method === "GET")).toBe(true);
  });
  it("uses a custom message", async () => {
    const gh = fakeGitHub({});
    await publishToGitHub({ "content/a.json": "x" }, { ...opts(gh.fetcher), message: "New diary entry" });
    expect(gh.calls.find((c) => c.path === "/git/commits" && c.method === "POST")!.body!.message).toBe("New diary entry");
  });
  it("reports auth and conflict failures without updating the branch", async () => {
    const denied = fakeGitHub({}, { failOn: "/git/ref/", status: 401 });
    expect(await publishToGitHub({ "content/a.json": "x" }, opts(denied.fetcher))).toMatchObject({ ok: false, status: 401, error: expect.stringContaining("GITHUB_TOKEN") });
    const moved = fakeGitHub({}, { failOn: "/git/refs/heads", status: 422 });
    const result = await publishToGitHub({ "content/a.json": "x" }, opts(moved.fetcher));
    expect(result).toMatchObject({ ok: false, status: 422, error: expect.stringContaining("Try again") });
  });
  it("refuses when the branch's content is newer than the draft's base", async () => {
    const changed = fakeGitHub({ "content/a.json": "someone-else" });
    const stale = await publishToGitHub({ "content/a.json": "x" }, { ...opts(changed.fetcher), base: { "content/a.json": "hello\n" } });
    expect(stale).toMatchObject({ ok: false, status: 409, error: expect.stringContaining("newer content") });
    expect(changed.calls.every((c) => c.method === "GET")).toBe(true);
    const added = fakeGitHub({ "content/a.json": HELLO_SHA, "content/pages/new.json": "n" });
    expect(await publishToGitHub({ "content/a.json": "x" }, { ...opts(added.fetcher), base: { "content/a.json": "hello\n" } })).toMatchObject({ ok: false, status: 409 });
  });
  it("publishes when the draft's base matches the branch", async () => {
    const gh = fakeGitHub({ "content/a.json": HELLO_SHA });
    expect(await publishToGitHub({ "content/a.json": "x" }, { ...opts(gh.fetcher), base: { "content/a.json": "hello\n" } })).toMatchObject({ ok: true, commit: "commit2" });
  });
});

describe("build status", () => {
  const runs = (list: { status: string; conclusion: string | null }[], ok = true) =>
    (async () => new Response(JSON.stringify({ workflow_runs: list }), { status: ok ? 200 : 403 })) as unknown as Parameters<typeof buildStatus>[1]["fetcher"];
  it("reads the Actions runs for the commit", async () => {
    const opts = { repo: "a/b", token: "t" };
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([{ status: "queued", conclusion: null }]) })).toBe("queued");
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([{ status: "in_progress", conclusion: null }]) })).toBe("running");
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([{ status: "completed", conclusion: "success" }]) })).toBe("success");
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([{ status: "completed", conclusion: "failure" }]) })).toBe("failure");
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([]) })).toBe("unknown");
    expect(await buildStatus("abc1234", { ...opts, fetcher: runs([], false) })).toBe("unknown");
  });
});
