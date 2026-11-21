import { describe, expect, it } from "vitest";
import { listVersions, versionFiles } from "./history";

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

function fakeGitHub(routes: Record<string, unknown>) {
  const seen: string[] = [];
  const fetcher = async (input: string) => {
    const path = input.replace("https://api.github.com/repos/me/site", "");
    seen.push(path);
    const body = routes[path.split("?")[0]!];
    return body === undefined ? new Response("nope", { status: 404 }) : new Response(JSON.stringify(body), { status: 200 });
  };
  return { fetcher, seen };
}

describe("version history", () => {
  it("lists content commits with who pushed them", async () => {
    const { fetcher, seen } = fakeGitHub({
      "/commits": [
        { sha: "a".repeat(40), commit: { message: "Push to production: Home: Variant 1 (by alex)", author: null, committer: { date: "2026-11-21T15:00:00Z" } } },
        { sha: "b".repeat(40), commit: { message: "Publish from the editor: content/pages/home.json\n\nmore", author: { date: "2026-11-20T10:00:00Z" }, committer: null } },
      ],
    });
    const list = await listVersions({ repo: "me/site", branch: "main", token: "t", fetcher }, 20);
    expect(seen[0]).toBe("/commits?sha=main&path=content&per_page=20");
    expect(list).toEqual([
      { sha: "a".repeat(40), at: "2026-11-21T15:00:00Z", message: "Push to production: Home: Variant 1", who: "alex" },
      { sha: "b".repeat(40), at: "2026-11-20T10:00:00Z", message: "Publish from the editor: content/pages/home.json", who: null },
    ]);
  });

  it("reads a version's content files back from git, and only those", async () => {
    const { fetcher } = fakeGitHub({
      "/git/commits/abc1234": { tree: { sha: "tree1" } },
      "/git/trees/tree1": {
        tree: [
          { path: "content/site.json", type: "blob", sha: "s1" },
          { path: "content/pages/home.json", type: "blob", sha: "s2" },
          { path: "content/pages", type: "tree", sha: "x" },
          { path: "cms/src/index.ts", type: "blob", sha: "s3" },
        ],
      },
      "/git/blobs/s1": { content: b64('{"name":"Café"}'), encoding: "base64" },
      "/git/blobs/s2": { content: b64("{}"), encoding: "base64" },
    });
    const files = await versionFiles("abc1234", { repo: "me/site", branch: "main", token: "t", fetcher });
    expect(files).toEqual({ "content/site.json": '{"name":"Café"}', "content/pages/home.json": "{}" });
    await expect(versionFiles("not-a-sha", { repo: "me/site", branch: "main", token: "t", fetcher })).rejects.toThrow("Not a version id.");
  });
});
