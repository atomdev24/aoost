import type { LinkTarget } from "../../schema";
import { useEditor } from "../store";
import { Select, TextInput } from "../ui/kit";

/** Choose what a link points to: a page, a section on a page, a URL or an email. */
export function LinkField({ value, onChange, kinds }: { value: LinkTarget | undefined; onChange: (v: LinkTarget) => void; kinds?: LinkTarget["kind"][] }) {
  const pages = useEditor((s) => s.site.pages);
  const v: LinkTarget = value ?? { kind: "url", url: "" };
  const firstPage = pages[0]?.id ?? "";
  const page = v.kind === "page" || v.kind === "section" ? pages.find((p) => p.id === v.pageId) : undefined;
  return (
    <div className="ed-stack">
      {kinds?.length === 1 ? null : <Select
        ariaLabel="Link type"
        value={v.kind}
        options={[
          { value: "page" as const, label: "Page" },
          { value: "section" as const, label: "Section on a page" },
          { value: "url" as const, label: "URL" },
          { value: "email" as const, label: "Email" },
        ].filter((o) => !kinds || kinds.includes(o.value))}
        onChange={(kind) => {
          if (kind === "page") onChange({ kind, pageId: firstPage });
          else if (kind === "section") onChange({ kind, pageId: firstPage, sectionId: pages[0]?.sections[0]?.id ?? "" });
          else if (kind === "email") onChange({ kind, email: "" as string });
          else onChange({ kind: "url", url: "" });
        }}
      />}
      {v.kind === "page" || v.kind === "section" ? (
        <Select
          ariaLabel="Page"
          value={v.pageId}
          options={pages.map((p) => ({ value: p.id, label: `${p.parentId ? "— " : ""}${p.title}` }))}
          onChange={(pageId) => {
            const target = pages.find((p) => p.id === pageId);
            if (!target) return;
            onChange(v.kind === "page" ? { kind: "page", pageId } : { kind: "section", pageId, sectionId: target.sections[0]?.id ?? "" });
          }}
        />
      ) : null}
      {v.kind === "section" ? (
        <Select ariaLabel="Section" value={v.sectionId} options={(page?.sections ?? []).map((s, i) => ({ value: s.id, label: s.name ?? `Section ${i + 1}` }))} onChange={(sectionId) => sectionId && onChange({ ...v, sectionId })} />
      ) : null}
      {v.kind === "url" ? <TextInput ariaLabel="URL" placeholder="https://… or /page" value={v.url} onCommit={(url) => onChange({ kind: "url", url })} /> : null}
      {v.kind === "email" ? <TextInput ariaLabel="Email address" type="email" placeholder="you@example.com" value={v.email} onCommit={(email) => onChange({ kind: "email", email })} /> : null}
    </div>
  );
}
