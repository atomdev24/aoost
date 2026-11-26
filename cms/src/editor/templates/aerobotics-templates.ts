import { CUSTOMER_LOGOS } from "../../components/aerobotics/AeroHero/AeroHero";
import { PRODUCT_CARDS } from "../../components/aerobotics/AeroProductCard/AeroProductCard";
import { productSplit } from "../../components/aerobotics/AeroSplit/AeroSplit";
import { art } from "../../components/aerobotics/shared";
import { createNode, createSection, sectionForBlock } from "../../model/page-ops";
import type { Section } from "../../schema";
import type { SiteTemplate } from "./site-templates";

/**
 * Whole Aerobotics pages built from the Aerobotics blocks (Insert › Brand), one per page type on
 * aerobotics.com plus a campaign page. Every part stays editable; using one puts the Aerobotics nav
 * on the site (unless it already has it).
 */

const A = "https://aerobotics.com";
/** One block in its own edge-to-edge section, named for the Layers panel. */
const band = (name: string, type: string, content: Record<string, unknown> = {}): Section => ({ ...sectionForBlock(createNode(type, { content })), name });
const footer = () => band("Footer", "AeroFooter");
const cta = (title?: string) => band("Call to action", "AeroCta", title ? { title } : {});
/**
 * Aerobotics' own HubSpot forms (account 8626769, EU), as aerobotics.com embeds them. They start
 * switched off (a placeholder that sends nothing); "Send submissions to HubSpot" turns them on.
 */
const HUBSPOT = { contact: "c97c36e7-7161-4ac3-9cef-ffd4ecba9ffa", demo: "d8e51afa-df82-45ec-944d-d3236c4458fc" };
const PLACEHOLDER = {
  contact: { placeholderFields: "First name, Last name, Work email, Company, Country, Message", placeholderButton: "Send message" },
  demo: { placeholderFields: "First name, Last name, Work email, Phone number, Company, Country, Crops you grow", placeholderButton: "Request a demo" },
};
const form = (which: keyof typeof HUBSPOT) => createNode("HubSpotForm", { content: { portalId: "8626769", formId: HUBSPOT[which], region: "eu1", heading: "", live: false, ...PLACEHOLDER[which], placeholderNote: "" } });

const page = (t: Omit<SiteTemplate, "hideNav" | "nav">): SiteTemplate => ({ ...t, hideNav: false, nav: "aerobotics" });

export const AEROBOTICS_TEMPLATES: SiteTemplate[] = [
  page({
    id: "aero-home",
    name: "Aerobotics home",
    hint: "Photo hero, the platform, the three TrueFruit products, success stories",
    thumb: art("hero_home"),
    sections: () => [
      band("Hero", "AeroHero"),
      band("Take photos", "AeroSplit"),
      band("Platform", "AeroShowcase"),
      band("Suite", "AeroText", { title: "Explore our suite of tools to enhance trusted farming methods for yield forecasting", body: "", align: "center", bg: "soft" }),
      ...PRODUCT_CARDS.map((c) => band(c.eyebrow, "AeroProductCard", c)),
      band("Success stories", "AeroStories"),
      cta(),
      footer(),
    ],
  }),
  page({
    id: "aero-product",
    name: "Product page",
    hint: "Product hero with its badge, live graphs, platform tour, benefits and a quote",
    thumb: art("hero_size"),
    sections: () => [
      band("Hero", "AeroHero", {
        image: art("hero_size"),
        alt: "Measuring oranges on the tree with a phone",
        badge: art("badge_truefruit_size"),
        title: "Precise fruit sizing & size forecasting",
        text: "Get up-to-date size forecasts with accurate measurements collected throughout the season using smartphone imagery.",
        secondaryLabel: "",
        logos: [],
      }),
      band("Digital calliper", "AeroSplit", productSplit()),
      band("Guided tour", "AeroShowcase", { title: "Take a guided tour of TrueFruit Size in the platform", text: "This short video gives you an overview on how TrueFruit Size works", background: art("showcase_orchard"), screen: art("dash_size"), screenAlt: "TrueFruit Size in the platform: growth curves and size distribution" }),
      band("Benefits", "AeroFeatures"),
      band("Quote", "AeroTestimonial"),
      cta("Increase your packouts by up to 5% by hitting your target size."),
      footer(),
    ],
  }),
  page({
    id: "aero-campaign",
    name: "Campaign or event page",
    hint: "A short page for a launch or a trade show: hero, the product, events, a quote",
    thumb: art("product_binscan"),
    sections: () => [
      band("Hero", "AeroHero", {
        image: art("product_binscan"),
        alt: "Scanning a bin of lemons with a phone",
        height: "medium",
        eyebrow: "Meet us at Interpoma, 25 — 27 Nov 2026",
        title: "See TrueFruit Bin Scan live at our stand",
        text: "Size and quality for every bin at intake, from one photo. Book a time and we'll show you on your own fruit.",
        primaryLabel: "Book a meeting",
        primaryUrl: `${A}/contact-us`,
        secondaryLabel: "See how it works",
        secondaryUrl: `${A}/true-fruit-bin-scan`,
        logos: [],
      }),
      band("Product", "AeroSplit", {
        title: "Post-harvest size and quality classification",
        text: "Scan bins as they arrive and know their size distribution, colour and blemishes before they're packed.",
        cropsLabel: "Available for",
        crops: [{ crop: "apple" }, { crop: "blueberry" }, { crop: "orange" }, { crop: "lemon" }, { crop: "pomegranate" }, { crop: "peach" }],
        media: "picture",
        image: art("product_binscan"),
        alt: "Scanning a bin of lemons with a phone",
        primaryLabel: "Discover TrueFruit Bin Scan",
        primaryUrl: `${A}/true-fruit-bin-scan`,
        bg: "white",
      }),
      band("Events", "AeroEvents"),
      band("Quote", "AeroTestimonial"),
      cta("Book a meeting with our team at the show."),
      footer(),
    ],
  }),
  page({
    id: "aero-pricing",
    name: "Pricing",
    hint: "The plan card with its ticked points, then the FAQ",
    thumb: art("pricing_laptop"),
    sections: () => [band("Pricing", "AeroPricing"), band("FAQ", "AeroFaq"), footer()],
  }),
  page({
    id: "aero-about",
    name: "About us",
    hint: "Intro, key numbers, team photos, our story and our customers",
    thumb: art("team_1"),
    sections: () => [
      band("Intro", "AeroPageHeader", {
        title: "About us",
        text: "Today, farmers face the growing challenge of feeding a rising global population while protecting our planet's limited resources. Growers plant for the future, and we create world-leading technologies to help them see it clearer.",
        bg: "soft",
      }),
      band("Numbers", "AeroStats"),
      band("Photos", "AeroPhotoGrid"),
      band("Our story", "AeroText"),
      band("Our team", "AeroText", { title: "Our Team", body: `We are a team of agronomists, engineers, product developers, creatives and customer service experts, passionate about working with the agriculture industry.\n\nInterested in working with us? Visit our [careers page](${A}/careers) to see our open positions.` }),
      band("Our customers", "AeroText", { title: "Our Customers", body: "We are excited to be working with some of the best fruit companies in the world. Our customers are at the center of every decision we make and we're privileged to be walking this journey with them.", image: art("world_map"), alt: "Map of where Aerobotics customers are" }),
      band("Logos", "AeroLogos", { title: "", logos: CUSTOMER_LOGOS, bg: "soft" }),
      footer(),
    ],
  }),
  page({
    id: "aero-careers",
    name: "Careers",
    hint: "Join us, team photos, what defines us and our perks",
    thumb: art("team_3"),
    sections: () => [
      band("Intro", "AeroPageHeader", {
        title: "Join us in building the best yield forecasting technology for our growers",
        text: "We're making a positive impact on farming and the planet. We're looking for people who want to be a part of an innovative team that drives solutions for a critical industry.",
        bg: "soft",
      }),
      band("Photos", "AeroPhotoGrid", { photos: [1, 3, 5].map((n) => ({ src: art(`team_${n}`), alt: "The Aerobotics team" })) }),
      band("What defines us", "AeroFeatures", {
        title: "What defines us",
        columns: 4,
        look: "rule",
        align: "left",
        items: [
          { icon: "", title: "Farmers first", text: "Everything that we do has the customer at the centre. Every strategy, every operational metric and every decision is executed with the best intention of our customers." },
          { icon: "", title: "We are builders", text: "Every employee that works at Aerobotics has a stake in the business and our expectation is for everyone to take full ownership and accountability of their roles." },
          { icon: "", title: "Back the A-Team", text: "The Aerobotics environment is caring and supportive. We give feedback constructively, and credit where it is due." },
          { icon: "", title: "Delivery is key", text: "We are driven by learning, output and execution. We strive for simplicity in solving problems that are complex. Our employees are reliable and dependable." },
        ],
      }),
      band("Perks", "AeroFeatures", {
        title: "Our perks",
        columns: 3,
        look: "plain",
        align: "left",
        bg: "soft",
        items: [
          { icon: "", title: "Hybrid work", text: "We prioritise in-person collaboration, so our Cape Town team works mostly from the office with the flexibility to work remotely when needed." },
          { icon: "", title: "Tasty perks", text: "Coffee runs at our local coffee spot, and nutritious subsidised lunches when working in the office." },
          { icon: "", title: "Training & development", text: "We invest in our people, and aim to grow talent through various training and team development initiatives." },
        ],
      }),
      cta("See our open positions and apply."),
      footer(),
    ],
  }),
  page({
    id: "aero-contact",
    name: "Contact",
    hint: "Get in touch: photo header, offices beside a form, upcoming events",
    thumb: art("hero_orchard"),
    sections: () => [
      band("Hero", "AeroHero", {
        image: art("hero_orchard"),
        alt: "An orchard from above",
        align: "center",
        height: "medium",
        title: "Get in touch",
        text: "Have a question or need more information? Reach out to our team for inquiries, consultations, or any other assistance.",
        primaryLabel: "",
        secondaryLabel: "",
        logos: [],
      }),
      createSection("grid", {
        name: "Offices and form",
        layout: { base: { columns: 1, gap: 32, padding: "56px 20px", maxWidth: 1100, background: { color: "#FFFFFF" } }, desktop: { columns: 2, gap: 80, padding: "88px 40px", maxWidth: 1100, background: { color: "#FFFFFF" } } },
        children: [createNode("AeroOffices"), form("contact")],
      }),
      band("Events", "AeroEvents"),
      footer(),
    ],
  }),
  page({
    id: "aero-demo",
    name: "Request a demo",
    hint: "A short header and the demo request form",
    thumb: art("dash_yield"),
    sections: () => [
      band("Header", "AeroPageHeader"),
      createSection("flow", { name: "Form", layout: { base: { columns: 1, gap: 18, padding: "48px 20px 88px", maxWidth: 720, background: { color: "#FFFFFF" } } }, children: [form("demo")] }),
      footer(),
    ],
  }),
  page({
    id: "aero-drone",
    name: "Drone partners",
    hint: "Recruit pilots: photo hero, why fly with us, the steps to join",
    thumb: art("hero_drone"),
    sections: () => [
      band("Hero", "AeroHero", {
        image: art("hero_drone"),
        alt: "A mapping drone in flight",
        height: "medium",
        eyebrow: "Drone Partners",
        title: "Become a drone partner",
        text: "With the right equipment, certification and training you will be able to grow your business and earn as you fly for tree crop growers around the world.",
        primaryLabel: "Get in touch",
        primaryUrl: `${A}/contact-us`,
        secondaryLabel: "",
        logos: [],
      }),
      band("Why fly with us", "AeroFeatures", {
        title: "",
        look: "plain",
        align: "left",
        items: [
          { icon: "", title: "You fly, we pay", text: "Earn from your very first flight for us. We pay per acre." },
          { icon: "", title: "Award-winning tools", text: "You'll be delivering a cutting-edge product suite and adding value to an essential industry." },
          { icon: "", title: "Premium support", text: "Comprehensive training resources, regular educational webinars and a team that's here to help you deliver." },
        ],
      }),
      band("Steps", "AeroSteps"),
      cta("Increase your yields with data-driven decisions"),
      footer(),
    ],
  }),
];
