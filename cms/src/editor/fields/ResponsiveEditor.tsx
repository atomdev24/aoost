import { Fragment, useId } from "react";
import { isOverridden, resetToDesktop, resolve, setAt, setOnly } from "../../responsive/resolve";
import { Length, type Responsive, type SectionLayout, type Style } from "../../schema";
import { useEditor } from "../store";
import { ColorInput, NumberInput, Row, Select, TextInput, Toggle } from "../ui/kit";
import type { RowContext, RowDef } from "./rows";

const BOX = new Set(["x", "y", "w", "h"]);

/**
 * Edits a Responsive<T> at the active breakpoint. Desktop is the reference:
 * an edit on Mobile changes Mobile only (setOnly) and the value gets a blue
 * dot; the dot, or "Reset to desktop", brings back the desktop value. The
 * stored format stays mobile-base + desktop overrides (SPEC §3).
 */
export function ResponsiveEditor<T extends object>({
  value,
  onChange,
  rows,
  ctx = {},
  groups: onlyGroups,
  hideHeads,
}: {
  value: Responsive<T>;
  onChange: (next: Responsive<T>) => void;
  rows: RowDef<T>[];
  ctx?: RowContext;
  /** Show only these row groups (in this order). */
  groups?: string[];
  /** Groups whose subheading the surrounding panel already shows. */
  hideHeads?: string[];
}) {
  const bp = useEditor((s) => s.bp);
  const uid = useId();
  const safe: Responsive<T> = value ?? ({ base: {} } as Responsive<T>);
  const current = resolve(safe, bp) as Record<string, unknown>;
  // Visibility has its own "Visible on" switches.
  const visible = rows.filter((r) => r.key !== "hidden" && (!r.when || r.when(ctx)) && (!onlyGroups || onlyGroups.includes(r.group)));
  const groups = onlyGroups ? onlyGroups.filter((g) => visible.some((r) => r.group === g)) : [...new Set(visible.map((r) => r.group))];
  // A free-canvas layer's position and size on mobile also drive desktop's scaled layout, as dragging does.
  const drivesDesktop = (key: string) => ctx.parentKind === "canvas" && BOX.has(key);
  const set = (key: string, v: unknown) => onChange((drivesDesktop(key) ? setAt : setOnly)(safe, bp, { [key]: v } as Partial<T>));
  const overridden = visible.filter((r) => isOverridden(safe, r.key as keyof T));

  return (
    <div className="ed-responsive">
      {groups.map((group) => (
        <Fragment key={group}>
          {groups.length > 1 && !hideHeads?.includes(group) ? <h5 className="ed-subhead">{group}</h5> : null}
          {visible
            .filter((r) => r.group === group)
            .map((row) => {
              const over = isOverridden(safe, row.key as keyof T);
              const dot =
                bp === "mobile" && over ? (
                  <button type="button" className="ed-dot" title="Mobile-only change. Click to reset to desktop." aria-label={`Reset ${row.label} to desktop`} onClick={() => onChange(resetToDesktop(safe, row.key as keyof T))} />
                ) : bp === "desktop" && over ? (
                  <span className="ed-dot ed-dot-hollow" title="Mobile has its own value for this" />
                ) : null;
              const id = `${uid}-${row.key}`;
              return (
                <Row key={row.key} label={row.label} dot={dot} htmlFor={id} stack={row.kind === "corners" || row.kind === "border" || row.kind === "filter" || row.kind === "background"}>
                  <Control row={row} id={id} value={current[row.key]} onChange={(v) => set(row.key, v)} />
                </Row>
              );
            })}
        </Fragment>
      ))}
      {bp === "mobile" && overridden.length ? (
        <p className="ed-override-note">
          Blue dots are mobile-only changes.{" "}
          <button
            type="button"
            className="ed-link"
            onClick={() => onChange(overridden.reduce((r, row) => resetToDesktop(r, row.key as keyof T), safe))}
          >
            Reset to desktop
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Control<T>({ row, value, onChange, id }: { row: RowDef<T>; value: unknown; onChange: (v: unknown) => void; id: string }) {
  switch (row.kind) {
    case "length":
      return <TextInput id={id} value={(value as string) ?? ""} placeholder={row.placeholder} validate={(v) => Length.safeParse(v).success} onCommit={(v) => onChange(v || undefined)} />;
    case "aspect":
      return <AspectControl id={id} value={value as string | undefined} onChange={onChange} />;
    case "text":
      return <TextInput id={id} value={(value as string) ?? ""} placeholder={row.placeholder} onCommit={(v) => onChange(v || undefined)} />;
    case "number":
      return <NumberInput id={id} value={value as number | undefined} min={row.min} max={row.max} step={row.step} suffix={row.suffix} placeholder={row.placeholder} onCommit={onChange} />;
    case "select":
      return <Select id={id} value={(value as string) ?? ""} options={row.options ?? []} onChange={(v) => onChange(v || undefined)} />;
    case "color":
      return <ColorInput label={row.label} value={value as string | undefined} onChange={onChange} />;
    case "toggle":
      return <Toggle label={row.label} checked={!!value} onChange={(v) => onChange(v || undefined)} />;
    case "corners":
      return <Corners value={value as Style["radius"]} onChange={onChange} />;
    case "border":
      return <BorderControl value={value as Style["border"]} onChange={onChange} />;
    case "filter":
      return <FilterControl value={value as Style["filter"]} onChange={onChange} />;
    case "background":
      return <BackgroundControl value={value as SectionLayout["background"]} onChange={onChange} />;
  }
}

const RATIOS = ["1/1", "4/3", "3/2", "16/9", "3/4", "2/3", "9/16"];
function AspectControl({ value, onChange, id }: { value: string | undefined; onChange: (v: unknown) => void; id: string }) {
  const preset = value === undefined ? "" : RATIOS.includes(value.replace(/\s/g, "")) ? value.replace(/\s/g, "") : "custom";
  return (
    <div className="ed-inline">
      <Select
        id={id}
        value={preset}
        options={[{ value: "", label: "Free" }, ...RATIOS.map((r) => ({ value: r, label: r.replace("/", " : ") })), { value: "custom", label: "Custom" }]}
        onChange={(v) => onChange(v === "" ? undefined : v === "custom" ? (value ?? "5/4") : v)}
      />
      {preset === "custom" ? <TextInput ariaLabel="Custom aspect ratio" value={value ?? ""} placeholder="5/4" validate={(v) => /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(v)} onCommit={(v) => onChange(v || undefined)} /> : null}
    </div>
  );
}

const CORNERS = ["Top left", "Top right", "Bottom right", "Bottom left"];
function Corners({ value, onChange }: { value: Style["radius"]; onChange: (v: unknown) => void }) {
  const r = value ?? [0, 0, 0, 0];
  const same = r.every((n) => n === r[0]);
  return (
    <div className="ed-corners">
      {CORNERS.map((name, i) => (
        <NumberInput
          key={name}
          ariaLabel={`${name} radius`}
          value={r[i]}
          min={0}
          onCommit={(n) => {
            const next = [...r] as [number, number, number, number];
            // While all four corners match, the first box sets them together; edit another box to split them.
            if (same && i === 0) next.fill(n ?? 0);
            else next[i] = n ?? 0;
            onChange(next.every((x) => x === 0) ? undefined : next);
          }}
        />
      ))}
    </div>
  );
}

function BorderControl({ value, onChange }: { value: Style["border"]; onChange: (v: unknown) => void }) {
  const b = value ?? { width: 0, style: "solid" as const, color: "token:ink" };
  const set = (patch: Partial<NonNullable<Style["border"]>>) => {
    const next = { ...b, ...patch };
    onChange(next.width > 0 ? next : undefined);
  };
  return (
    <div className="ed-inline">
      <NumberInput ariaLabel="Border width" value={value?.width} min={0} max={40} step={0.5} placeholder="0" suffix="px" onCommit={(n) => set({ width: n ?? 0 })} />
      <Select
        ariaLabel="Border style"
        value={b.style}
        options={[
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
        ]}
        onChange={(v) => set({ style: (v || "solid") as "solid" })}
      />
      <ColorInput label="Border colour" value={b.color} onChange={(c) => set({ color: c ?? "token:ink" })} />
    </div>
  );
}

function FilterControl({ value, onChange }: { value: Style["filter"]; onChange: (v: unknown) => void }) {
  const f = value ?? { kind: "none" as const };
  return (
    <div className="ed-inline">
      <Select
        ariaLabel="Filter"
        value={f.kind}
        options={[
          { value: "none", label: "None" },
          { value: "grayscale", label: "Grayscale" },
          { value: "duotone", label: "Duotone" },
        ]}
        onChange={(v) => onChange(v === "none" || v === "" ? undefined : { ...f, kind: v })}
      />
      {f.kind === "duotone" ? (
        <>
          <ColorInput label="Duotone shadows" value={f.dark ?? "token:ink"} onChange={(c) => onChange({ ...f, dark: c })} />
          <ColorInput label="Duotone highlights" value={f.light ?? "token:bone"} onChange={(c) => onChange({ ...f, light: c })} />
        </>
      ) : null}
    </div>
  );
}

function BackgroundControl({ value, onChange }: { value: SectionLayout["background"]; onChange: (v: unknown) => void }) {
  const bg = value ?? {};
  const set = (patch: Partial<NonNullable<SectionLayout["background"]>>) => {
    const next = Object.fromEntries(Object.entries({ ...bg, ...patch }).filter(([, v]) => v !== undefined && v !== ""));
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="ed-stack">
      <ColorInput label="Background colour" value={bg.color} onChange={(c) => set({ color: c })} />
      <TextInput ariaLabel="Background image" placeholder="Image URL (or pick from Assets)" value={bg.image ?? ""} onCommit={(v) => set({ image: v })} />
      <TextInput ariaLabel="Background video" placeholder="Video URL (desktop only)" value={bg.video ?? ""} onCommit={(v) => set({ video: v })} />
      <TextInput ariaLabel="Poster image" placeholder="Still image for phones" value={bg.poster ?? ""} onCommit={(v) => set({ poster: v })} />
      <TextInput ariaLabel="Tint over the background" placeholder="Tint, e.g. rgba(20,20,20,.4)" value={bg.overlay ?? ""} onCommit={(v) => set({ overlay: v })} />
    </div>
  );
}
