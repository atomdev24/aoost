import { useState } from "react";
import type { Theme } from "../../schema";
import { MediaInput } from "../fields/media";
import { update, useEditor } from "../store";
import { Select, TextInput } from "./kit";

/** A short list of well-made Google families that suit the site; any other family name can be typed in. */
export const GOOGLE_FONTS = [
  "Inter",
  "Space Grotesk",
  "Space Mono",
  "JetBrains Mono",
  "IBM Plex Sans",
  "IBM Plex Mono",
  "DM Sans",
  "DM Serif Display",
  "Archivo",
  "Archivo Black",
  "Anton",
  "Bebas Neue",
  "Syne",
  "Unbounded",
  "Bricolage Grotesque",
  "Familjen Grotesk",
  "Instrument Serif",
  "Fraunces",
  "Playfair Display",
  "Rye",
  "Smokum",
  "Sancreek",
  "Special Elite",
  "Courier Prime",
  "Caveat",
  "Permanent Marker",
  "Rubik Mono One",
  "Work Sans",
  "Manrope",
  "Outfit",
];

const FALLBACK = { display: "Inter, system-ui, sans-serif", body: "system-ui, sans-serif", mono: "ui-monospace, monospace" };
const setTheme = (fn: (t: Theme) => Theme, label: string) => update((site) => ({ ...site, theme: fn(site.theme) }), label);
const familyOf = (spec: string) => spec.split(":")[0]!.trim();
const quote = (family: string) => (/\s/.test(family) ? `'${family}'` : family);
const first = (stack: string) => stack.split(",")[0]!.trim().replace(/^['"]|['"]$/g, "");

/**
 * Fonts: upload your own files (e.g. Facile Sans), add Google Fonts, and
 * choose which family the display, body and mono slots use.
 */
export function FontsPanel() {
  const theme = useEditor((s) => s.site.theme);
  const [upload, setUpload] = useState({ family: "", src: "", weight: "400", style: "normal" as "normal" | "italic" });
  const [google, setGoogle] = useState("");
  const [weights, setWeights] = useState("400;700");

  const uploaded = [...new Set(theme.fontFaces.map((f) => f.family))];
  const googles = theme.googleFonts.map(familyOf);
  const families = [...new Set([...uploaded, ...googles])];

  return (
    <>
      <div className="ed-theme-block">
        {(["display", "body", "mono"] as const).map((slot) => (
          <div key={slot} className="ed-field">
            <span className="ed-field-label">{slot === "display" ? "Display (headings)" : slot === "body" ? "Body" : "Mono (code)"}</span>
            <Select
              ariaLabel={`${slot} font`}
              value={families.includes(first(theme.fonts[slot])) ? first(theme.fonts[slot]) : ""}
              options={[{ value: "", label: `Custom: ${first(theme.fonts[slot])}` }, ...families.map((f) => ({ value: f, label: f }))]}
              onChange={(family) =>
                family &&
                setTheme((t) => {
                  // Keep the rest of the stack as fallbacks while the new font loads.
                  const rest = t.fonts[slot].split(",").map((s) => s.trim()).filter((s) => first(s) !== family);
                  return { ...t, fonts: { ...t.fonts, [slot]: [quote(family), ...(rest.length ? rest : [FALLBACK[slot]])].join(", ") } };
                }, `Set ${slot} font to ${family}`)
              }
            />
            <TextInput ariaLabel={`${slot} font stack`} value={theme.fonts[slot]} onCommit={(v) => v && setTheme((t) => ({ ...t, fonts: { ...t.fonts, [slot]: v } }), `Change ${slot} font`)} />
          </div>
        ))}
        <p className="ed-hint">The first family in each stack that has loaded is used; the rest are fallbacks.</p>
      </div>

      <div className="ed-panel-head">
        <span className="ed-caps">Uploaded fonts</span>
      </div>
      <ul className="ed-layers">
        {theme.fontFaces.map((face, i) => (
          <li key={`${face.family}-${face.weight}-${face.style}-${i}`} className="ed-layer" style={{ paddingLeft: 8 }}>
            <span className="ed-layer-name" style={{ cursor: "default" }}>
              <span style={{ fontFamily: quote(face.family) }}>{face.family}</span>
              <small>
                {face.weight}
                {face.style === "italic" ? " italic" : ""}
              </small>
            </span>
            <button type="button" className="ed-mini" aria-label={`Remove ${face.family} ${face.weight}`} onClick={() => setTheme((t) => ({ ...t, fontFaces: t.fontFaces.filter((_, j) => j !== i) }), `Remove font ${face.family}`)}>
              ×
            </button>
          </li>
        ))}
        {!theme.fontFaces.length ? <li className="ed-empty">No uploaded fonts.</li> : null}
      </ul>
      <div className="ed-panel-foot">
        <MediaInput kind="font" label="Font file" value={upload.src} onChange={(src) => setUpload((u) => ({ ...u, src, family: u.family || (src.split("/").pop() ?? "").replace(/[-_.].*$/, "") }))} />
        <input className="ed-input" value={upload.family} onChange={(e) => setUpload({ ...upload, family: e.target.value })} placeholder="Family name, e.g. Facile Sans" aria-label="Font family name" />
        <div className="ed-form-two ed-form-tight">
          <input className="ed-input" value={upload.weight} onChange={(e) => setUpload({ ...upload, weight: e.target.value })} placeholder="Weight, e.g. 400 or 400 700" aria-label="Font weight" />
          <Select
            ariaLabel="Font style"
            value={upload.style}
            options={[
              { value: "normal", label: "Upright" },
              { value: "italic", label: "Italic" },
            ]}
            onChange={(style) => setUpload({ ...upload, style: (style || "normal") as "normal" })}
          />
        </div>
        <button
          type="button"
          className="ed-btn ed-btn-ghost"
          disabled={!upload.src || !upload.family.trim() || !/^\d{3}( \d{3})?$/.test(upload.weight.trim())}
          onClick={() => {
            setTheme((t) => ({ ...t, fontFaces: [...t.fontFaces, { family: upload.family.trim(), src: upload.src, weight: upload.weight.trim(), style: upload.style }] }), `Add font ${upload.family.trim()}`);
            setUpload({ family: "", src: "", weight: "400", style: "normal" });
          }}
        >
          Add uploaded font
        </button>
        <p className="ed-hint">WOFF2 is best; OTF and TTF work too. Only upload fonts whose licence allows web use.</p>
      </div>

      <div className="ed-panel-head">
        <span className="ed-caps">Google Fonts</span>
      </div>
      <ul className="ed-layers">
        {theme.googleFonts.map((spec) => (
          <li key={spec} className="ed-layer" style={{ paddingLeft: 8 }}>
            <span className="ed-layer-name" style={{ cursor: "default" }}>
              <span>{familyOf(spec)}</span>
              <small>{spec.includes("@") ? spec.split("@")[1]!.replace(/;/g, ", ") : "400"}</small>
            </span>
            <button type="button" className="ed-mini" aria-label={`Remove ${familyOf(spec)}`} onClick={() => setTheme((t) => ({ ...t, googleFonts: t.googleFonts.filter((s) => s !== spec) }), `Remove Google font ${familyOf(spec)}`)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="ed-panel-foot"
        onSubmit={(e) => {
          e.preventDefault();
          const family = google.trim();
          if (!family || googles.includes(family)) return;
          const w = weights
            .split(/[;, ]+/)
            .filter((x) => /^[1-9]00$/.test(x))
            .sort()
            .join(";");
          setTheme((t) => ({ ...t, googleFonts: [...t.googleFonts, w ? `${family}:wght@${w}` : family] }), `Add Google font ${family}`);
          setGoogle("");
        }}
      >
        <input className="ed-input" list="ed-google-fonts" value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="Pick or type a family" aria-label="Google font family" />
        <datalist id="ed-google-fonts">
          {GOOGLE_FONTS.filter((f) => !googles.includes(f)).map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <div className="ed-add" style={{ padding: 0 }}>
          <input className="ed-input" value={weights} onChange={(e) => setWeights(e.target.value)} placeholder="Weights, e.g. 400;700" aria-label="Weights" />
          <button type="submit" className="ed-btn ed-btn-ghost" disabled={!google.trim() || googles.includes(google.trim())}>
            Add
          </button>
        </div>
        <p className="ed-hint">Each family and weight is another download for visitors, so keep the list short.</p>
      </form>
    </>
  );
}
