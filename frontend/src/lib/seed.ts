import type { AppState } from "./types";

// Demo brand data — realistic seed for the MVP. Everything here is demo data
// for a fictional brand ("SmartDesk" line) so judges can explore immediately.

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number, hourOffset = 0) =>
  new Date(Date.now() - n * DAY - hourOffset * 60 * 60 * 1000).toISOString();

export function createSeedState(): AppState {
  return {
    org: { name: "Northwind Workspaces Pvt. Ltd.", industry: "Office Furniture" },
    user: { name: "Priya Sharma", email: "priya@northwind.example.com", role: "Brand Manager" },
    guidelines: [
      {
        id: "gl_1",
        title: "Professional & Friendly Tone",
        description: "All customer-facing copy must sound professional yet approachable.",
        category: "Tone of Voice",
        rule: "Always use a professional and friendly tone. Avoid aggressive sales language and excessive exclamation marks.",
        severity: "medium",
        active: true,
        createdAt: daysAgo(40),
      },
      {
        id: "gl_2",
        title: "No Exaggerated Promotional Language",
        description: "Promotional copy must stay factual and verifiable.",
        category: "Advertising Claims",
        rule: "Avoid exaggerated promotional language. Never use unverified superlatives such as \"No. 1\" or \"the best\" without approved evidence.",
        severity: "critical",
        active: true,
        createdAt: daysAgo(40),
      },
      {
        id: "gl_3",
        title: "Consistent Product Naming",
        description: "The official product name must be used everywhere, exactly as registered.",
        category: "Naming",
        rule: "Use the official product name consistently. Do not split, abbreviate or re-case product names.",
        severity: "high",
        active: true,
        createdAt: daysAgo(38),
      },
      {
        id: "gl_4",
        title: "Approved Pricing Disclosure",
        description: "Only prices from the Approved Product Facts table may appear in content.",
        category: "Pricing",
        rule: "Published prices must match the approved product record exactly. Sale prices require a separate approval.",
        severity: "critical",
        active: true,
        createdAt: daysAgo(38),
      },
      {
        id: "gl_5",
        title: "Legacy Email Sign-off (retired)",
        description: "Replaced by the 2026 tone guide; kept for reference only.",
        category: "Tone of Voice",
        rule: "Legacy rule: end every email with \"Warm regards, Team NW\".",
        severity: "low",
        active: false,
        createdAt: daysAgo(120),
      },
    ],
    facts: [
      {
        id: "pf_1",
        productName: "SmartDesk",
        approvedPrice: "₹5,000",
        specification: "Height adjustable; oak finish; 5-year warranty.",
        approvedDescription: "Ergonomic workstation for everyday use.",
        updatedAt: daysAgo(12),
      },
      {
        id: "pf_2",
        productName: "SmartDesk Pro",
        approvedPrice: "₹9,500",
        specification: "Height + tilt adjustable; walnut finish; anti-fatigue mat included.",
        approvedDescription: "Premium ergonomic workstation for professionals.",
        updatedAt: daysAgo(9),
      },
    ],
    terminology: [
      {
        id: "trm_1",
        preferred: "value-driven pricing",
        restricted: "cheap",
        alternative: "affordable",
      },
      {
        id: "trm_2",
        preferred: "innovative design",
        restricted: "revolutionary",
        alternative: "thoughtfully engineered",
      },
      {
        id: "trm_3",
        preferred: "trusted by teams",
        restricted: "world-class",
        alternative: "professionally certified",
      },
    ],
    documents: [
      {
        id: "doc_1",
        name: "Brand Guidelines v3.pdf",
        status: "indexed",
        sizeLabel: "2.4 MB",
        uploadedAt: daysAgo(21),
      },
      {
        id: "doc_2",
        name: "Approved Product Facts — Q4 2026.xlsx",
        status: "indexed",
        sizeLabel: "318 KB",
        uploadedAt: daysAgo(14),
      },
      {
        id: "doc_3",
        name: "Tone of Voice Guide 2026.pdf",
        status: "processing",
        sizeLabel: "1.1 MB",
        uploadedAt: daysAgo(2),
      },
      {
        id: "doc_4",
        name: "Agency Campaign Notes (scan).pdf",
        status: "failed",
        sizeLabel: "5.7 MB",
        uploadedAt: daysAgo(6),
      },
    ],
    submissions: [],
  };
}

export const SAMPLE_CONTENT =
  "Introducing SmartDesk, the No. 1 ergonomic desk in India! Get yours today for just ₹4,000. Our revolutionary desk guarantees 100% productivity improvement.";

export const SAMPLE_CONTENT_TITLE = "SmartDesk Festive Launch Ad";
export const SAMPLE_CONTENT_TYPE = "Advertisement" as const;

// Seed submissions are analysed by the rule-based engine so the demo history
// matches exactly what the analyzer would report for this brand.
export const SEED_SUBMISSION_INPUTS: Array<{
  title: string;
  contentType: import("./types").ContentType;
  content: string;
  ageDays: number;
}> = [
  {
    title: "SmartDesk Festive Launch Ad",
    contentType: "Advertisement",
    content: SAMPLE_CONTENT,
    ageDays: 3,
  },
  {
    title: "SmartDesk Product Page Copy",
    contentType: "Product Description",
    content:
      "SmartDesk is an ergonomic workstation for everyday use, available for ₹5,000. Its height-adjustable frame suits home and office setups alike.",
    ageDays: 5,
  },
  {
    title: "Republic Day Sale Email",
    contentType: "Email",
    content:
      "Hi there! Our Republic Day sale is live — grab the Smart Desk at a cheap ₹4,500 today. It is the best desk you will find!!",
    ageDays: 7,
  },
  {
    title: "LinkedIn Recruitment Post",
    contentType: "Social Media",
    content:
      "We are hiring! Join Northwind Workspaces and help build thoughtfully engineered furniture for modern teams.",
    ageDays: 10,
  },
];
