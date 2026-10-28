/**
 * Copy for the public marketing site.
 *
 * Written for call-center owners: what the service does for them and how to
 * start. Deliberately absent: how numbers are selected, API details, dial-plan
 * code, safeguards and tuning advice. Those are internal and shared during
 * onboarding only.
 */

export const SITE_NAME = "SYMBO DID Portal";

/** Optional: set NEXT_PUBLIC_CONTACT_EMAIL to show a contact address. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export const NAV = [
  { label: "Overview", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Features", href: "/features" },
  { label: "FAQ", href: "/faq" },
] as const;

export interface Titled {
  title: string;
  description: string;
}

export const HIGHLIGHTS = [
  { value: "Local", label: "caller ID on every call" },
  { value: "Automatic", label: "no numbers to manage by hand" },
  { value: "Your dialer", label: "works with Asterisk and Vicidial" },
  { value: "One place", label: "to see calls and usage" },
] as const;

export const PROBLEMS: Titled[] = [
  {
    title: "People ignore unfamiliar numbers",
    description: "A call from a number outside their area is easy to dismiss. A local number looks familiar.",
  },
  {
    title: "Managing numbers is a chore",
    description: "Lists of numbers, manual changes and no clear view of what is being used.",
  },
  {
    title: "Several teams, no clear picture",
    description: "When more than one team dials, it is hard to see who is doing what and what it costs.",
  },
];

export const SOLUTIONS: Titled[] = [
  {
    title: "A local number on every call",
    description: "Your customers see a number from their own area, without your team choosing or changing anything.",
  },
  {
    title: "Nothing to manage",
    description: "We look after the numbers. Your agents just dial as they always have.",
  },
  {
    title: "Clear reporting",
    description: "See your calls, your usage and your history in one dashboard, and export it whenever you need.",
  },
];

export const AUDIENCES: Titled[] = [
  { title: "Sales teams", description: "Reach more prospects with a number they recognise as local." },
  { title: "Collections and service teams", description: "Get your calls noticed and answered." },
  { title: "Multi-team call centers", description: "Run several teams with a clear view of each." },
];

export const STEPS: Titled[] = [
  {
    title: "We set up your call center",
    description: "Tell us about your team and your dialer. We create your account and get everything ready.",
  },
  {
    title: "Connect your dialer",
    description: "Our team gives you the simple setup details for your dialer and helps you through them.",
  },
  {
    title: "Dial as normal",
    description: "Your agents make calls the way they always do. Each call shows a local number to the person called.",
  },
  {
    title: "Track it in your dashboard",
    description: "Watch your calls, review your history and export your records.",
  },
];

export interface FeatureGroup {
  id: string;
  title: string;
  summary: string;
  items: Titled[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "local",
    title: "Local numbers",
    summary: "Calls that look like they come from down the road.",
    items: [
      { title: "Matched to who you call", description: "The number shown fits the area you are calling." },
      { title: "Automatic", description: "No setup per call and nothing for agents to do." },
      { title: "Works with your dialer", description: "Built for Asterisk and Vicidial." },
    ],
  },
  {
    id: "visibility",
    title: "Visibility",
    summary: "Always know what is happening.",
    items: [
      { title: "Live dashboard", description: "See activity on your lines as it happens." },
      { title: "Call history", description: "A full record of your calls, with export for spreadsheets and billing." },
      { title: "Reports", description: "Call volume, locations and usage over time." },
    ],
  },
  {
    id: "teams",
    title: "Built for teams",
    summary: "Run one team or many.",
    items: [
      { title: "Separate access per call center", description: "Each team gets its own private access." },
      { title: "Usage and charges", description: "Clear records for each team, ready for billing." },
      { title: "Secure by design", description: "Access is limited to your own systems." },
    ],
  },
];

export const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "The basics",
    items: [
      {
        q: "What does SYMBO DID Portal do?",
        a: "It makes your outbound calls show a local phone number to the person you are calling, so your calls look familiar instead of unknown.",
      },
      {
        q: "What is a DID?",
        a: "A DID is simply a phone number. The portal supplies the numbers your calls appear from, and looks after them for you.",
      },
      {
        q: "Does it carry my calls?",
        a: "No. Your own dialer and phone provider still make the calls. We only take care of the number that is shown.",
      },
      {
        q: "Which dialers does it work with?",
        a: "Asterisk and Vicidial.",
      },
    ],
  },
  {
    category: "Getting started",
    items: [
      {
        q: "How do I get started?",
        a: "Get in touch. We set up your call center, then give you the simple details to connect your dialer and help you through it.",
      },
      {
        q: "Will my agents need to change how they work?",
        a: "No. They dial as normal.",
      },
      {
        q: "How many numbers will I need?",
        a: "It depends on how many calls you make and where you call. We will work that out with you during setup.",
      },
    ],
  },
  {
    category: "Running it",
    items: [
      {
        q: "Can I run several teams?",
        a: "Yes. Each call center has its own access and its own records.",
      },
      {
        q: "Can I see and export my call data?",
        a: "Yes. Your dashboard shows your calls and usage, and you can export your history.",
      },
    ],
  },
];

export const ONBOARDING: Titled[] = [
  {
    title: "Contact us",
    description: "Tell us about your call center, your dialer and where you call.",
  },
  {
    title: "We set you up",
    description: "We create your account and prepare everything on our side.",
  },
  {
    title: "Connect your dialer",
    description: "We give you the setup details and help you connect.",
  },
  {
    title: "Start calling",
    description: "Make a test call, then go live.",
  },
];

export const CHECKLIST = [
  "Which dialer you use (Asterisk or Vicidial)",
  "Roughly how many calls your team makes",
  "The areas or states you call most",
  "A contact person for setup",
] as const;
