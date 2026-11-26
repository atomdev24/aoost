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
});
export type HubSpotFormContent = z.infer<typeof HubSpotFormContent>;

const ID = /^[0-9]{3,12}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull the portal and form ids out of a pasted HubSpot embed code or share link. */
export function parseHubSpot(text: string): Partial<HubSpotFormContent> {
  const portalId = /portalId["'\s:=]+["']?(\d{3,12})/.exec(text)?.[1] ?? /share\.hsforms\.com\/[^/]*?(\d{3,12})/.exec(text)?.[1];
  const formId = /formId["'\s:=]+["']?([0-9a-f-]{36})/i.exec(text)?.[1];
  const region = /region["'\s:=]+["']?(na1|eu1)/.exec(text)?.[1] as "na1" | "eu1" | undefined;
  return { ...(portalId ? { portalId } : {}), ...(formId ? { formId } : {}), ...(region ? { region } : {}) };
}

/**
 * A HubSpot form (sign-ups, demo requests): HubSpot's own embed, so submissions land in HubSpot
 * with its tracking. The editor shows a stand-in; the form itself loads on the live page.
 */
export const HubSpotForm = defineComponent<HubSpotFormContent>({
  type: "HubSpotForm",
  label: "HubSpot form",
  category: "embed",
  schema: HubSpotFormContent,
  defaults: { content: { embed: "", portalId: "", formId: "", region: "na1", heading: "" } },
  css,
  Render: ({ node, content: raw, ctx }) => {
    // Typed ids win over ones read from the pasted embed code.
    const fromEmbed = raw.embed ? parseHubSpot(raw.embed) : {};
    const content = { ...raw, portalId: raw.portalId || fromEmbed.portalId || "", formId: raw.formId || fromEmbed.formId || "", region: fromEmbed.region && !raw.portalId ? fromEmbed.region : raw.region };
    const ready = ID.test(content.portalId) && GUID.test(content.formId);
    const heading = content.heading ? <h3 className="hsf-heading">{content.heading}</h3> : null;
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
