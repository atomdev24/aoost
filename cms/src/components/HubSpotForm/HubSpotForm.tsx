import type { ReactNode } from "react";
import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./HubSpotForm.styles";

export const HubSpotFormContent = z.object({
  /** HubSpot's embed code or share link, pasted as is; the ids are read from it. */
  embed: z.string().optional(),
  /** The HubSpot account (portal) id, e.g. "1234567". */
  portalId: z.string(),
  /** The form id (a GUID), from the form's Share → Embed code in HubSpot. */
  formId: z.string(),
  /** The data region of the HubSpot account. */
  region: z.enum(["na1", "eu1"]),
  /** A short heading above the form (optional). */
  heading: z.string().optional(),
  /** Send submissions to HubSpot. Off (the default) shows a placeholder form that sends nothing. */
  live: z.boolean().optional(),
  /** The placeholder's field names, comma separated. */
  placeholderFields: z.string().optional(),
  /** The placeholder's button. */
  placeholderButton: z.string().optional(),
  /** A line under the placeholder (e.g. "Email us at hello@… for now"). */
  placeholderNote: z.string().optional(),
});
export type HubSpotFormContent = z.infer<typeof HubSpotFormContent>;

export const PLACEHOLDER_FIELDS = "First name, Last name, Work email, Company, Country, Message";

const ID = /^[0-9]{3,12}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull the portal and form ids out of a pasted HubSpot embed code or share link. */
export function parseHubSpot(text: string): Partial<HubSpotFormContent> {
  const portalId = /portalId["'\s:=]+["']?(\d{3,12})/.exec(text)?.[1] ?? /share\.hsforms\.com\/[^/]*?(\d{3,12})/.exec(text)?.[1];
  const formId = /formId["'\s:=]+["']?([0-9a-f-]{36})/i.exec(text)?.[1];
  const region = /region["'\s:=]+["']?(na1|eu1)/.exec(text)?.[1] as "na1" | "eu1" | undefined;
  return { ...(portalId ? { portalId } : {}), ...(formId ? { formId } : {}), ...(region ? { region } : {}) };
}

/** The form's look with nothing behind it: disabled fields and button, so the page keeps its layout. */
function Placeholder({ content, heading, editing }: { content: HubSpotFormContent; heading: ReactNode; editing: boolean }) {
  const names = (content.placeholderFields || PLACEHOLDER_FIELDS)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    <div className="hsf hsf-off">
      {heading}
      {editing ? <p className="hsf-badge">Placeholder: not sending to HubSpot. Switch it on in this block's settings.</p> : null}
      <div className="hsf-ph" aria-disabled="true">
        {names.map((n, i) => (
          <label key={i} className={`hsf-ph-field${/message|comment|details|question/i.test(n) ? " hsf-ph-long" : ""}`}>
            <span>{n}</span>
            {/message|comment|details|question/i.test(n) ? <textarea disabled rows={3} /> : <input disabled type="text" />}
          </label>
        ))}
        <button type="button" className="hsf-ph-button" disabled>
          {content.placeholderButton || "Submit"}
        </button>
      </div>
      {content.placeholderNote ? <p className="hsf-ph-note">{content.placeholderNote}</p> : null}
    </div>
  );
}

/**
 * A HubSpot form (sign-ups, demo requests): HubSpot's own embed, so submissions land in HubSpot
 * with its tracking. Off by default: until "Send submissions to HubSpot" is on, the page shows a
 * placeholder form that sends nothing. When on, the editor shows a stand-in and the form itself
 * loads on the live page.
 */
export const HubSpotForm = defineComponent<HubSpotFormContent>({
  type: "HubSpotForm",
  label: "HubSpot form",
  category: "embed",
  schema: HubSpotFormContent,
  defaults: { content: { embed: "", portalId: "", formId: "", region: "na1", heading: "", live: false, placeholderFields: PLACEHOLDER_FIELDS, placeholderButton: "Submit", placeholderNote: "" } },
  css,
  Render: ({ node, content: raw, ctx }) => {
    // Typed ids win over ones read from the pasted embed code.
    const fromEmbed = raw.embed ? parseHubSpot(raw.embed) : {};
    const content = { ...raw, portalId: raw.portalId || fromEmbed.portalId || "", formId: raw.formId || fromEmbed.formId || "", region: fromEmbed.region && !raw.portalId ? fromEmbed.region : raw.region };
    const ready = ID.test(content.portalId) && GUID.test(content.formId);
    const heading = content.heading ? <h3 className="hsf-heading">{content.heading}</h3> : null;
    if (!content.live) return <Placeholder content={content} heading={heading} editing={ctx.editing} />;
    if (ctx.editing || !ready) {
      if (!ctx.editing) return null;
      return (
        <div className="hsf">
          {heading}
          <div className="hsf-stand-in">
            <span className="hsf-field" />
            <span className="hsf-field" />
            <span className="hsf-field hsf-short" />
            <span className="hsf-button" />
            <p>{ready ? "HubSpot form: it loads on the live page." : "Paste the HubSpot embed code in this block's settings (or type the portal and form ids)."}</p>
          </div>
        </div>
      );
    }
    const target = `hsf-${node.id}`;
    const create = `(function(){function go(){window.hbspt.forms.create(${JSON.stringify({ region: content.region, portalId: content.portalId, formId: content.formId, target: `#${target}` })})}if(window.hbspt)return go();var s=document.querySelector('script[data-hsforms]');if(!s){s=document.createElement('script');s.src='https://js.hsforms.net/forms/embed/v2.js';s.async=true;s.setAttribute('data-hsforms','');document.head.appendChild(s)}s.addEventListener('load',go)})();`;
    return (
      <div className="hsf">
        {heading}
        <div id={target} className="hsf-target" />
        <script dangerouslySetInnerHTML={{ __html: create }} />
      </div>
    );
  },
});
