import { useState } from "react";
import type { Theme, TypeStyle } from "../../schema";
import { update, useEditor } from "../store";
import { NumberInput, Select, TextInput, Toggle } from "./kit";

/** Tokens the built-in components rely on; these can be changed but not removed. */
const CORE_COLORS = ["bone", "sand", "ink", "text", "muted", "rust", "rustOnDark", "line"];
const CORE_STYLES = ["hero", "h1", "h2", "h3", "body", "small", "label"];
const tokenName = (raw: string) => raw.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : "")).replace(/^[^a-zA-Z]+/, "");

const setTheme = (fn: (t: Theme) => Theme, label: string, merge?: string) => update((site) => ({ ...site, theme: fn(site.theme) }), label, { merge });

/**
 * Theme: the design tokens (SPEC §9). Change a colour or a text style here
 * and every page that uses it updates, because pages store token names and
 * the site renders them as CSS variables and style classes.
 */
export function ThemePanel() {
  const theme = useEditor((s) => s.site.theme);
  const [open, setOpen] = useState<string | null>("h1");
  const [newColor, setNewColor] = useState("");

  return (
    <div className="ed-panel ed-theme">
      <div className="ed-panel-head">
        <span className="ed-caps">Colours</span>
      </div>
      <ul className="ed-tokens">
        {Object.entries(theme.colors).map(([name, value]) => (
          <li key={name}>
            <input
              type="color"
              className="ed-colorwell"
              aria-label={`${name} colour`}
              value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
              onChange={(e) => setTheme((t) => ({ ...t, colors: { ...t.colors, [name]: e.target.value.toUpperCase() } }), `Change colour ${name}`, `color:${name}`)}
            />
            <span className="ed-token-name">{name}</span>
            <TextInput ariaLabel={`${name} value`} value={value} onCommit={(v) => v && setTheme((t) => ({ ...t, colors: { ...t.colors, [name]: v } }), `Change colour ${name}`)} />
            {CORE_COLORS.includes(name) ? (
              <span className="ed-mini" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className="ed-mini"
                aria-label={`Remove colour ${name}`}
                onClick={() =>
                  setTheme((t) => {
                    const { [name]: _gone, ...colors } = t.colors;
                    return { ...t, colors };
                  }, `Remove colour ${name}`)
                }
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="ed-add"
        onSubmit={(e) => {
          e.preventDefault();
          const name = tokenName(newColor);
          if (!name || name in theme.colors) return;
          setTheme((t) => ({ ...t, colors: { ...t.colors, [name]: "#B5421A" } }), `Add colour ${name}`);
          setNewColor("");
        }}
      >
        <input className="ed-input" value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="New colour name" aria-label="New colour name" />
        <button type="submit" className="ed-btn ed-btn-ghost" disabled={!tokenName(newColor) || tokenName(newColor) in theme.colors}>
          Add
        </button>
      </form>

      <div className="ed-panel-head">
        <span className="ed-caps">Fonts</span>
      </div>
      <div className="ed-theme-block">
        {(["display", "body", "mono"] as const).map((slot) => (
          <label key={slot} className="ed-field">
            <span className="ed-field-label">{slot === "display" ? "Display (headings)" : slot === "body" ? "Body" : "Mono (code)"}</span>
            <TextInput value={theme.fonts[slot]} onCommit={(v) => v && setTheme((t) => ({ ...t, fonts: { ...t.fonts, [slot]: v } }), `Change ${slot} font`)} />
          </label>
        ))}
        <p className="ed-hint">A font stack: the first family that is loaded wins. Upload fonts or add Google Fonts in Assets.</p>
      </div>

      <div className="ed-panel-head">
        <span className="ed-caps">Text styles</span>
      </div>
      <ul className="ed-styles">
        {Object.entries(theme.typeStyles).map(([id, style]) => (
          <li key={id}>
            <button type="button" className="ed-style-head" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
              <span style={{ fontFamily: theme.fonts[style.font], fontWeight: style.weight, letterSpacing: `${style.tracking}em`, textTransform: style.uppercase ? "uppercase" : "none" }}>{style.name}</span>
              <small>
                {style.size.base}
                {style.size.desktop ? ` / ${style.size.desktop}` : ""}px
              </small>
            </button>
            {open === id ? <TypeStyleEditor id={id} style={style} removable={!CORE_STYLES.includes(id)} /> : null}
          </li>
        ))}
      </ul>
      <div className="ed-panel-foot">
        <button
          type="button"
          className="ed-btn ed-btn-ghost"
          onClick={() => {
            let n = 1;
            while (`style${n}` in theme.typeStyles) n++;
            setTheme((t) => ({ ...t, typeStyles: { ...t.typeStyles, [`style${n}`]: { ...t.typeStyles.body!, name: `New style ${n}` } } }), "Add text style");
            setOpen(`style${n}`);
          }}
        >
          Add a text style
        </button>
      </div>

      <div className="ed-panel-head">
        <span className="ed-caps">Corner radii</span>
      </div>
      <Scale group="radii" values={theme.radii} />
      <div className="ed-panel-head">
        <span className="ed-caps">Spacing</span>
      </div>
      <Scale group="spacing" values={theme.spacing} />
    </div>
  );
}

function TypeStyleEditor({ id, style, removable }: { id: string; style: TypeStyle; removable: boolean }) {
  const set = (patch: Partial<TypeStyle>) => setTheme((t) => ({ ...t, typeStyles: { ...t.typeStyles, [id]: { ...style, ...patch } } }), `Change text style ${style.name}`, `type:${id}`);
  return (
    <div className="ed-style-body">
      <div className="ed-row">
        <span className="ed-label">Name</span>
        <TextInput ariaLabel="Style name" value={style.name} onCommit={(name) => name && set({ name })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Font</span>
        <Select
          ariaLabel="Font"
          value={style.font}
          options={[
            { value: "display", label: "Display" },
            { value: "body", label: "Body" },
            { value: "mono", label: "Mono" },
          ]}
          onChange={(font) => font && set({ font })}
        />
      </div>
      <div className="ed-row">
        <span className="ed-label">Size, mobile</span>
        <NumberInput ariaLabel="Size on mobile" value={style.size.base} min={6} max={400} suffix="px" onCommit={(n) => n && set({ size: { ...style.size, base: n } })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Size, desktop</span>
        <NumberInput ariaLabel="Size on desktop" value={style.size.desktop} min={6} max={400} suffix="px" placeholder="same" onCommit={(n) => set({ size: { base: style.size.base, ...(n ? { desktop: n } : {}) } })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Weight</span>
        <NumberInput ariaLabel="Weight" value={style.weight} min={100} max={900} step={100} onCommit={(n) => n && set({ weight: n })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Line height</span>
        <NumberInput ariaLabel="Line height" value={style.lineHeight} min={0.6} max={3} step={0.05} onCommit={(n) => n && set({ lineHeight: n })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Letter spacing</span>
        <NumberInput ariaLabel="Letter spacing" value={style.tracking} min={-0.2} max={1} step={0.01} suffix="em" onCommit={(n) => set({ tracking: n ?? 0 })} />
      </div>
      <div className="ed-row">
        <span className="ed-label">Uppercase</span>
        <div className="ed-control">
          <Toggle label="Uppercase" checked={!!style.uppercase} onChange={(v) => set({ uppercase: v || undefined })} />
        </div>
      </div>
      {removable ? (
        <button
          type="button"
          className="ed-btn ed-btn-ghost"
          onClick={() =>
            setTheme((t) => {
              const { [id]: _gone, ...typeStyles } = t.typeStyles;
              return { ...t, typeStyles };
            }, `Remove text style ${style.name}`)
          }
        >
          Remove this style
        </button>
      ) : null}
    </div>
  );
}

function Scale({ group, values }: { group: "radii" | "spacing"; values: Record<string, number> }) {
  return (
    <div className="ed-scale">
      {Object.entries(values).map(([name, value]) => (
        <label key={name}>
          <span>{name}</span>
          <NumberInput ariaLabel={`${group} ${name}`} value={value} min={0} suffix="px" onCommit={(n) => setTheme((t) => ({ ...t, [group]: { ...t[group], [name]: n ?? 0 } }), `Change ${group} ${name}`, `${group}:${name}`)} />
        </label>
      ))}
    </div>
  );
}
