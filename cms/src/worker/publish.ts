import type { ContentFiles } from "../schema";

/**
 * Publish = one git commit of the draft's content/ files, made through the
 * GitHub API (SPEC §2). The deploy Action then rebuilds the static site.
 * Git history is the version history.
 */
export type PublishResult = { ok: true; commit: string | null; url: string | null; changed: string[] } | { ok: false; status: number; error: string };

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

async function sha1(text: string): Promise<string> {
  // The git blob id: sha1("blob <bytes>\0" + content). Lets us skip unchanged files without downloading them.
  const body = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(header.length + body.length);
  all.set(header);
  all.set(body, header.length);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-1", all))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function publishToGitHub(
  files: ContentFiles,
  opts: { repo: string; branch: string; token: string; message?: string; fetcher?: Fetcher },
): Promise<PublishResult> {
  const fetcher = opts.fetcher ?? ((input, init) => fetch(input, init));
  const api = `https://api.github.com/repos/${opts.repo}`;
  const gh = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetcher(api + path, {
      ...init,
      headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "aoost-cms", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 200)}`), { status: res.status });
    return (await res.json()) as T;
  };

  try {
    const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(opts.branch)}`);
    const head = ref.object.sha;
    const commit = await gh<{ tree: { sha: string } }>(`/git/commits/${head}`);
    const tree = await gh<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(`/git/trees/${commit.tree.sha}?recursive=1`);
    const existing = new Map(tree.tree.filter((e) => e.type === "blob" && e.path.startsWith("content/")).map((e) => [e.path, e.sha]));

    const entries: { path: string; mode: "100644"; type: "blob"; content?: string; sha?: null }[] = [];
    const changed: string[] = [];
    for (const [path, body] of Object.entries(files)) {
      if (existing.get(path) === (await sha1(body))) continue;
      entries.push({ path, mode: "100644", type: "blob", content: body });
      changed.push(path);
    }
    for (const path of existing.keys()) {
      if (!(path in files)) {
        entries.push({ path, mode: "100644", type: "blob", sha: null }); // deleted page
        changed.push(path);
      }
    }
    if (!entries.length) return { ok: true, commit: null, url: null, changed: [] };

    const newTree = await gh<{ sha: string }>("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    const summary = changed.length === 1 ? changed[0]! : `${changed.length} files`;
    const made = await gh<{ sha: string; html_url: string }>("/git/commits", {
      method: "POST",
      body: JSON.stringify({ message: opts.message?.trim() || `Publish from the editor: ${summary}`, tree: newTree.sha, parents: [head] }),
    });
    // Not forced: if the branch moved since we read it, this fails and nothing is overwritten.
    await gh(`/git/refs/heads/${encodeURIComponent(opts.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: made.sha, force: false }) });
    return { ok: true, commit: made.sha, url: made.html_url, changed };
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    const hint = status === 401 || status === 403 ? " Check GITHUB_TOKEN (Contents: read and write on this repo)." : status === 404 ? " Check GITHUB_REPO and PUBLISH_BRANCH." : status === 422 ? " The branch changed while publishing. Try again." : "";
    return { ok: false, status, error: (e instanceof Error ? e.message : "Publishing failed.") + hint };
  }
}

export type BuildState = "queued" | "running" | "success" | "failure" | "unknown";

/**
 * How the rebuild after a publish is going: the GitHub Actions runs for that
 * commit. "unknown" when there is no run (yet) or the token can't read Actions.
 */
export async function buildStatus(sha: string, opts: { repo: string; token: string; fetcher?: Fetcher }): Promise<BuildState> {
  const fetcher = opts.fetcher ?? ((input, init) => fetch(input, init));
  try {
    const res = await fetcher(`https://api.github.com/repos/${opts.repo}/actions/runs?head_sha=${sha}&per_page=10`, {
      headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "aoost-cms" },
    });
    if (!res.ok) return "unknown";
    const { workflow_runs: runs = [] } = (await res.json()) as { workflow_runs?: { status: string; conclusion: string | null }[] };
    if (!runs.length) return "unknown";
    if (runs.some((r) => r.status === "completed" && r.conclusion && !["success", "skipped", "neutral"].includes(r.conclusion))) return "failure";
    if (runs.every((r) => r.status === "completed")) return "success";
    return runs.some((r) => r.status === "in_progress") ? "running" : "queued";
  } catch {
    return "unknown";
  }
}
