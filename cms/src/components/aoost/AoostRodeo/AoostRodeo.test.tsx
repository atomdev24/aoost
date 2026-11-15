import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderNode } from "../../test-utils";
import { AoostRodeo } from "./AoostRodeo";

const d = AoostRodeo.defaults.content;

describe("AoostRodeo", () => {
  it("keeps the original markup: tumbleweed, canvas, name form and leaderboard", () => {
    const html = renderNode("AoostRodeo", d);
    expect(html).toContain('<section class="focus-sec" aria-labelledby="h-rodeo">');
    expect(html).toContain('<h2 id="h-rodeo" data-underline="5">rodeo</h2>');
    expect(html).toContain('<path id="tumblePath"></path>');
    expect(html).toContain('<canvas id="rodeo" tabindex="0" aria-label="Rodeo, a mini game.');
    expect(html).toContain('<form class="lb-form" id="lbForm" hidden="">');
    expect(html).toContain('<input id="lbName" maxLength="12" autoComplete="nickname" enterKeyHint="done" placeholder="NAME" required=""/>');
    expect(html).toContain('<span class="label lb-scope" id="lbScope">this device</span>');
    expect(html).toContain('<ol class="lb-list" id="lbList"></ol>');
    expect(html).not.toContain("rodeo-copy");
  });
  it("can hide the leaderboard and add a line of copy", () => {
    const html = renderNode("AoostRodeo", { ...d, showLeaderboard: false, copy: "Tap to jump." });
    expect(html).toContain('<div class="board-wrap" hidden="">');
    expect(html).toContain('<p class="rodeo-copy">Tap to jump.</p>');
    expect(html).toContain('{"showLeaderboard":false}');
  });
  it("uses the same Supabase project and key as the original page", () => {
    const original = readFileSync(resolve(__dirname, "../../../../../index.html"), "utf8");
    const runtime = readFileSync(resolve(__dirname, "../runtime/shared.js"), "utf8");
    const pick = (s: string) => /url:'(https:\/\/[a-z0-9]+\.supabase\.co)',\s*key:'(sb_publishable_[A-Za-z0-9_-]+)'/.exec(s)!.slice(1, 3);
    expect(pick(runtime)).toEqual(pick(original));
  });
});
