import type { ContentFiles } from "../schema";

/**
 * Version history = the publish branch's commits that changed content/ (every
 * Publish and Push to production is one). A version's files are read back
 * from git, so any of them can be previewed or restored.
 */
export type Version = { sha: string; at: string; message: string; who: string | null };
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type Opts = { repo: string; branch: string; token: string; fetcher?: Fetcher };

function client(opts: Opts) {
  const fetcher = opts.fetcher ?? ((input, init) => fetch(input, init));
  return async <T>(path: string): Promise<T> => {
    const res = await fetcher(`https://api.github.com/repos/${opts.repo}${path}`, {
      headers: { Authorization: `Bearer ${opts.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "aoost-cms" },
    });
    if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status} on ${path.split("?")[0]}`), { status: res.status });
    return (await res.json()) as T;
  };
}

/** "Push to production: Home (by alex)" → "alex"; older messages carry no name. */
const whoFrom = (message: string) => /\(by ([^)]{1,40})\)\s*$/.exec(message.split("\n")[0]!)?.[1] ?? null;

export async function listVersions(opts: Opts, limit = 30): Promise<Version[]> {
  const gh = client(opts);
  const commits = await gh<{ sha: string; commit: { message: string; author: { date: string } | null; committer: { date: string } | null } }[]>(
    `/commits?sha=${encodeURIComponent(opts.branch)}&path=content&per_page=${Math.min(100, Math.max(1, limit))}`,
  );
  return commits.map((c) => {
    const message = c.commit.message.split("\n")[0]!.trim();
    return { sha: c.sha, at: c.commit.committer?.date ?? c.commit.author?.date ?? "", message: message.replace(/\s*\(by [^)]*\)\s*$/, ""), who: whoFrom(message) };
  });
}

const CONTENT_FILE = /^content\/(site\.json|collections\.json|pages\/[^/]+\.json)$/;

function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** The content files exactly as they were in one commit. */
export async function versionFiles(sha: string, opts: Opts): Promise<ContentFiles> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw Object.assign(new Error("Not a version id."), { status: 400 });
  const gh = client(opts);
  const commit = await gh<{ tree: { sha: string } }>(`/git/commits/${sha}`);
  const tree = await gh<{ tree: { path: string; type: string; sha: string }[] }>(`/git/trees/${commit.tree.sha}?recursive=1`);
  const wanted = tree.tree.filter((e) => e.type === "blob" && CONTENT_FILE.test(e.path));
  const files: ContentFiles = {};
  await Promise.all(
    wanted.map(async (e) => {
      const blob = await gh<{ content: string; encoding: string }>(`/git/blobs/${e.sha}`);
      files[e.path] = blob.encoding === "base64" ? decodeBase64(blob.content) : blob.content;
    }),
  );
  return files;
}

/** A small memory of recently read versions (a version never changes), so previewing several pages is quick. */
const cache = new Map<string, ContentFiles>();
export async function cachedVersionFiles(sha: string, opts: Opts): Promise<ContentFiles> {
  const hit = cache.get(sha);
  if (hit) return hit;
  const files = await versionFiles(sha, opts);
  cache.set(sha, files);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return files;
}
