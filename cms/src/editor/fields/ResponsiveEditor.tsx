import { Fragment, useId } from "react";
import { isOverridden, resetToMobile, resolve, setAt } from "../../responsive/resolve";
import { Length, type Responsive, type SectionLayout, type Style } from "../../schema";
import { useEditor } from "../store";
import { ColorInput, NumberInput, Row, Select, TextInput, Toggle } from "../ui/kit";
import type { RowContext, RowDef } from "./rows";

/**
 * Edits a Responsive<T> at the active breakpoint (SPEC §3): on Mobile it
 * writes the base, on Desktop it writes overrides only. A property that
 * differs from mobile shows a dot; clicking it resets to mobile.
 */
export function ResponsiveEditor<T extends object>({ value, onChange, rows, ctx = {} }: { value: Responsive<T>; onChange: (next: Responsive<T>) => void; rows: RowDef<T>[]; ctx?: RowContext }) {
  const bp = useEditor((s) => s.bp);
  const uid = useId();
  const safe: Responsive<T> = value ?? ({ base: {} } as Responsive<T>);
  const current = resolve(safe, bp) as Record<string, unknown>;
  const visible = rows.filter((r) => !r.when || r.when(ctx));
  const groups = [...new Set(visible.map((r) => r.group))];
  const set = (key: string, v: unknown) => onChange(setAt(safe, bp, { [key]: v } as Partial<T>));

  return (
    <div className="ed-responsive">
      <p className="ed-bp-note">
        Editing <strong>{bp === "mobile" ? "Mobile (base)" : "Desktop overrides"}</strong>
      </p>
      {groups.map((group) => (
        <Fragment key={group}>
          <h5 className="ed-subhead">{group}</h5>
          {visible
            .filter((r) => r.group === group)
            .map((row) => {
              const over = isOverridden(safe, row.key as keyof T);
              const dot =
                bp === "desktop" && over ? (
                  <button type="button" className="ed-dot" title="Differs from mobile. Click to reset to mobile." aria-label={`Reset ${row.label} to mobile`} onClick={() => onChange(resetToMobile(safe, row.key as keyof T))} />
                ) : bp === "mobile" && over ? (
                  <span className="ed-dot ed-dot-hollow" title="Desktop has its own value for this" />
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
    </div>
  );
}

function Control<T>({ row, value, onChange, id }: { row: RowDef<T>; value: unknown; onChange: (v: unknown) => void; id: string }) {
  switch (row.kind) {
    case "length":
      return <TextInput id={id} value={(value as string) ?? ""} placeholder={row.placeholder} validate={(v) => Length.safeParse(v).success} onCommit={(v) => onChange(v || undefined)} />;
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
            // While all four match, editing one keeps them linked; hold a different value in any to unlink.
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
