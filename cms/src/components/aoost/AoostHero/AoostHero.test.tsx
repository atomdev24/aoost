import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AoostHero, tickerLines } from "./AoostHero";

const d = AoostHero.defaults.content;

describe("AoostHero", () => {
  it("keeps the original markup: reel, strip labels, progress bar, ticker", () => {
    const html = renderNode("AoostHero", d);
    expect(html).toContain('<header class="hero-rect focus-sec" aria-label="Artwork">');
    expect(html).toContain('<div class="hr-track" id="reel">');
    expect(html).toContain('<span class="label">aoost / portfolio</span>');
    expect(html).toContain('id="clock">CPT --:--</span>');
    expect(html).toContain('<i id="hrBar"></i>');
    expect(html).toContain('<div class="ticker" id="ticker"');
    expect(html.match(/class="tk-half"/g)).toHaveLength(2);
  });
  it("defaults to the live site's content", () => {
    expect(d.reel).toEqual([{ src: "/art/hero.jpg", alt: "" }]);
    expect(tickerLines(d)).toEqual(["welcome", "pick a playlist", "beat the game, be the first on the board"]);
    expect(d.timeZone).toBe("Africa/Johannesburg");
  });
  it("renders content from fields, and hands the fields to the script as JSON", () => {
    const html = renderNode("AoostHero", { ...d, label: "aoost / diary", ticker: [{ text: "howdy <b>", mode: "both" }], tickerTopScore: false });
    expect(html).toContain('<span class="label">aoost / diary</span>');
    expect(html).toContain('<span class="tk-w">howdy &lt;b&gt;</span>');
    expect(html).not.toContain("beat the game");
    const json = /<script type="application\/json" data-ao-data="">(.*?)<\/script>/.exec(html)![1]!;
    expect(json).not.toContain("<b>"); // can't close the script early
    expect(JSON.parse(json).ticker[0].text).toBe("howdy <b>");
  });
  it("adds no fallback lines when no line applies", () => {
    expect(tickerLines({ ...d, ticker: [{ text: "night", mode: "late" }] })).toEqual(["beat the game, be the first on the board"]);
    expect(tickerLines({ ...d, ticker: [], tickerTopScore: false })).toEqual([]);
  });
  it("renders an empty strip, without crashing, when the ticker has no lines", () => {
    const html = renderNode("AoostHero", { ...d, ticker: [], tickerTopScore: false });
    expect(html).toContain('<div class="ticker" id="ticker"><div class="tk-track" aria-hidden="true"><div class="tk-half"></div><div class="tk-half"></div></div></div>');
    expect(html).not.toContain("welcome");
    expect(html).not.toContain("pick a disc");
  });
  it("shows the ticker by default, including for content saved before showTicker existed", () => {
    const { showTicker: _, ...older } = d;
    expect(AoostHero.schema.safeParse(older).success).toBe(true);
    expect(renderNode("AoostHero", older)).toContain('id="ticker"');
    expect(d.showTicker).toBe(true);
  });
  it("renders no ticker strip at all when showTicker is off", () => {
    const html = renderNode("AoostHero", { ...d, showTicker: false });
    expect(html).not.toContain('id="ticker"');
    expect(html).not.toContain("tk-");
    expect(html).toContain('id="reel"');
    expect(tickerLines({ ...d, showTicker: false })).toEqual([]);
  });
});
