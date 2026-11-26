import { art } from "../../components/aerobotics/shared";
import { addCollection } from "../../model/cms";
import { createNode, sectionForBlock } from "../../model/page-ops";
import { newId, type CmsField, type CmsItem, type Node, type Page, type Site } from "../../schema";

/**
 * Ready-made collections to start from (the demo starts with both): Aerobotics success stories and
 * trade-show events, each with fields, real entries from aerobotics.com and a page design built
 * from the Aerobotics blocks with its blocks connected to the fields.
 */

const A = "https://aerobotics.com";
const field = (id: string, name: string, type: CmsField["type"], options?: string[]): CmsField => ({ id, name, type, ...(options ? { options } : {}) });
const item = (title: string, slug: string, values: CmsItem["values"], status: CmsItem["status"] = "live"): CmsItem => ({ id: newId("i"), title, slug, status, values });
const bound = (type: string, content: Record<string, unknown>, bind: Record<string, string>): Node => ({ ...createNode(type, { content }), bind });
const band = (name: string, node: Node) => ({ ...sectionForBlock(node), name });
const page = (title: string, sections: Page["sections"]): Page => ({ id: newId("p"), title, slug: "/x", parentId: null, status: "draft", template: "blank", seo: {}, isHome: false, showInNav: false, hideNav: false, sections, overlays: [] });

const CROPS = ["Citrus", "Table grapes", "Apples", "Cherries", "Blueberries", "Avocado", "Almonds", "Other"];

export function successStories(): Parameters<typeof addCollection>[1] {
  const S = `${A}/success-stories/`;
  return {
    name: "Success stories",
    itemName: "Story",
    base: "success-stories",
    summaryField: "summary",
    imageField: "image",
    fields: [
      field("customer", "Customer", "text"),
      field("crop", "Crop", "choice", CROPS),
      field("country", "Country", "text"),
      field("image", "Picture", "image"),
      field("summary", "Summary", "longtext"),
      field("story", "Story", "longtext"),
      field("quote", "Quote", "longtext"),
      field("quoteBy", "Quote by", "text"),
      field("video", "Video link", "link"),
      field("date", "Date", "date"),
    ],
    items: [
      item("How TrueFruit helps improve decision-making for table grape growers", "table-grape-growers-south-africa", { customer: "Table grape growers", crop: "Table grapes", country: "South Africa", image: art("story_1"), summary: "How table grape growers in South Africa use TrueFruit to decide which blocks to pick, and when.", story: "Growers measure berry size through the season and plan picking teams around the forecast.", quote: "", quoteBy: "", video: S + "how-truefruit-helps-improve-decision-making-for-table-grape-growers-south-africa", date: "2026-03-10" }),
      item("Southern Cross Farms drives full-orchard intelligence", "southern-cross-farms", { customer: "Southern Cross Farms", crop: "Citrus", country: "United States", image: art("story_2"), summary: "Southern Cross Farms uses TrueFruit to scale from 10% sampling to 100% orchard intelligence for improved citrus quality.", story: "Instead of sampling a tenth of the orchard, the team now measures every block and acts on quality before harvest.", quote: "", quoteBy: "", video: "", date: "2026-02-04" }),
      item("AC Foods optimizes production", "ac-foods", { customer: "AC Foods", crop: "Citrus", country: "United States", image: art("story_3"), summary: "AC Foods uses TrueFruit to track fruit sizing and build growth curves, to deliver the right size fruit at the right time.", story: "Growth curves from TrueFruit Size tell the team which blocks will hit their target sizes, so the packhouse plans ahead.", quote: "", quoteBy: "", video: S + "ac-foods-testimonial", date: "2025-11-20" }),
      item("Fundo El Paraíso uses Aerobotics to scale citrus sampling", "fundo-el-paraiso", { customer: "Fundo El Paraíso", crop: "Citrus", country: "Peru", image: art("story_4"), summary: "Fundo El Paraíso scaled its citrus sampling, capturing 25x more data in 90% less time.", story: "Field teams photograph fruit instead of measuring by hand, covering far more trees each week.", quote: "", quoteBy: "", video: "", date: "2025-09-15" }),
      item("Unifrutti Eastern Cape optimizes fruit size", "unifrutti-eastern-cape", { customer: "Unifrutti", crop: "Citrus", country: "South Africa", image: art("product_size"), summary: "Watch how Unifrutti uses TrueFruit to measure and optimize fruit size throughout the season.", story: "", quote: "Previously we were measuring hundreds of fruit, now, with TrueFruit, we're measuring thousands in the same amount of time", quoteBy: "Claude, Unifrutti", video: "", date: "2025-08-01" }, "draft"),
    ],
    design: page("Story page", [
      band("Hero", bound("AeroHero", { height: "medium", logos: [], secondaryLabel: "", primaryLabel: "Watch the story", eyebrow: "Customer", title: "Story title", text: "Summary", image: art("story_2") }, { eyebrow: "customer", title: "title", text: "summary", image: "image", primaryUrl: "video" })),
      band("Story", bound("AeroText", { title: "The story", body: "The story goes here.", bg: "white" }, { body: "story" })),
      band("Quote", bound("AeroTestimonial", {}, { quote: "quote", person: "quoteBy" })),
      band("Call to action", createNode("AeroCta")),
      band("Footer", createNode("AeroFooter")),
    ]),
  };
}

export function events(): Parameters<typeof addCollection>[1] {
  const meet = `${A}/contact-us`;
  return {
    name: "Events",
    itemName: "Event",
    base: "events",
    summaryField: "summary",
    imageField: "photo",
    fields: [
      field("dates", "Dates", "text"),
      field("start", "Starts", "date"),
      field("city", "City", "text"),
      field("logo", "Logo", "image"),
      field("photo", "Photo", "image"),
      field("summary", "Summary", "longtext"),
      field("details", "Where to find us", "longtext"),
      field("booking", "Booking link", "link"),
    ],
    items: [
      item("Interpoma", "interpoma-2026", { dates: "25 — 27 Nov 2026", start: "2026-11-25", city: "Bolzano", logo: art("event_interpoma"), photo: art("product_size"), summary: "The apple show in Bolzano. See TrueFruit Size and Bin Scan on apples, live at our stand.", details: "Find us in the hall with our team from Europe. Book a time and we'll show you TrueFruit on your own fruit.", booking: meet }),
      item("Fruit Logistica", "fruit-logistica-2027", { dates: "3–5 Feb 2027", start: "2027-02-03", city: "Berlin", logo: art("event_fruit_logistica"), photo: art("product_binscan"), summary: "Meet the Aerobotics team in Berlin and see how packhouses use TrueFruit Bin Scan at intake.", details: "Our team will be at the show all three days.", booking: meet }),
      item("Fruit Attraction", "fruit-attraction-2027", { dates: "Oct 2027", start: "2027-10-05", city: "Madrid", logo: art("event_fruit_attraction"), photo: art("product_grade"), summary: "See TrueFruit Grade at Fruit Attraction in Madrid.", details: "Dates and stand to follow.", booking: meet }, "draft"),
    ],
    design: page("Event page", [
      band("Hero", bound("AeroHero", { height: "medium", logos: [], secondaryLabel: "", primaryLabel: "Book a meeting", eyebrow: "Dates", title: "Event name", text: "Summary", image: art("product_size") }, { eyebrow: "dates", title: "title", text: "summary", image: "photo", primaryUrl: "booking" })),
      band("Where to find us", bound("AeroText", { title: "Where to find us", body: "Details", bg: "white" }, { body: "details" })),
      band("Call to action", bound("AeroCta", { title: "Book a meeting with our team at the show.", secondaryLabel: "" }, { primaryUrl: "booking" })),
      band("Footer", createNode("AeroFooter")),
    ]),
  };
}

export const EXAMPLES = [
  { id: "stories", name: "Success stories", hint: "Customer stories with a picture, crop, quote and video", make: successStories },
  { id: "events", name: "Events", hint: "Trade shows with dates, city, logo and a booking link", make: events },
] as const;

/** Add an example collection (its address is made unique if taken). */
export const addExample = (site: Site, id: (typeof EXAMPLES)[number]["id"]) => addCollection(site, EXAMPLES.find((e) => e.id === id)!.make());
