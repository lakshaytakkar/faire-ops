/**
 * The 27 named image slots used by the suprans-landing site.
 * Non-technical teammates upload to these via /team/upload — the server
 * resizes to target dimensions and writes to Supabase Storage at the
 * filename in `key`. Components on suprans-landing read from those public URLs.
 */

export type ImageSlot = {
  /** Storage key (filename) — also used as the slot identifier. */
  key: string
  /** Section of the site this image belongs to. */
  section: string
  /** Short title shown to the teammate. */
  title: string
  /** Plain-English subject brief — what the photo should show. */
  brief: string
  /** Composition guidance — landscape vs portrait, framing notes. */
  composition: string
  /** Target output dimensions (sharp resizes, fit: cover). */
  width: number
  height: number
  /** Output format. */
  format: "jpg" | "png"
  /** Current placeholder URL (the AI-generated default we ship today). */
  current: string
}

const STORAGE_BASE =
  "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/suprans-landing-images"

/** Public URL the live site reads from once the teammate uploads. */
export function publicUrlFor(slotKey: string): string {
  return `${STORAGE_BASE}/${slotKey}`
}

export const IMAGE_SLOTS: ImageSlot[] = [
  // ── Hero + portrait ─────────────────────────────────────────────────
  {
    key: "hero-bg.jpg",
    section: "Homepage hero",
    title: "Homepage hero background",
    brief:
      "A wide shot of a Chinese industrial port — stacked shipping containers in the foreground, cranes silhouetted against the sky, ideally golden hour. No people. No text on screen.",
    composition: "Landscape (phone held sideways). Send the full-resolution original — do not crop.",
    width: 1920,
    height: 1080,
    format: "jpg",
    current: "/china/hero-bg.jpg",
  },
  {
    key: "founder-portrait.png",
    section: "Homepage hero",
    title: "Mr. Suprans portrait",
    brief:
      "Editorial headshot of Mr. Suprans (Lakshay) — dark blazer, white shirt, no tie, direct eye contact, slight half-smile. Plain dark background.",
    composition: "Portrait (vertical). Phone held upright. Face centered, shoulders visible.",
    width: 768,
    height: 1024,
    format: "png",
    current: "/china/founder-portrait.png",
  },

  // ── Trust gallery (6) ───────────────────────────────────────────────
  {
    key: "gallery-factory-floor.jpg",
    section: "Trust gallery",
    title: "Factory floor — Foshan or Guangzhou",
    brief:
      "Inside a Chinese manufacturing factory — rows of workstations, workers in uniform assembling consumer goods, stacked product boxes along the walls.",
    composition: "Landscape, wide angle. Aisle perspective showing depth.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-factory-floor.jpg",
  },
  {
    key: "gallery-qc-inspection.jpg",
    section: "Trust gallery",
    title: "Pre-shipment QC inspection",
    brief:
      "Indian QC inspector in a branded polo with a clipboard examining finished products at a workstation, Chinese supervisor beside.",
    composition: "Landscape. Both faces visible. Workstation in foreground.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-qc-inspection.jpg",
  },
  {
    key: "gallery-container-port.jpg",
    section: "Trust gallery",
    title: "Container port at dusk",
    brief:
      "Massive container port — thousands of stacked containers, cranes loading a docked ship, golden-magenta sunset.",
    composition: "Landscape, slight aerial angle.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-container-port.jpg",
  },
  {
    key: "gallery-trade-show.jpg",
    section: "Trust gallery",
    title: "Canton Fair / Yiwu Fair hall",
    brief:
      "Bustling Chinese trade-show hall — rows of booths, product displays, crowds of buyers walking between booths. Bright commercial lighting.",
    composition: "Landscape, wide angle showing scale.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-trade-show.jpg",
  },
  {
    key: "gallery-supplier-meeting.jpg",
    section: "Trust gallery",
    title: "Supplier meeting handshake",
    brief:
      "Indian businessman in a smart blazer shaking hands with a Chinese factory owner across a glass conference table with sample products laid out.",
    composition: "Landscape. Both subjects facing each other in profile, sample products in foreground.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-supplier-meeting.jpg",
  },
  {
    key: "gallery-yiwu-market.jpg",
    section: "Trust gallery",
    title: "Yiwu International Trade Market",
    brief:
      "Inside Yiwu Market — vast multi-story wholesale market with endless rows of small shop-units, bright fluorescent lighting.",
    composition: "Landscape, aisle disappearing into the distance.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/gallery-yiwu-market.jpg",
  },

  // ── Travel page ────────────────────────────────────────────────────
  {
    key: "travel-hero.jpg",
    section: "/travel",
    title: "Travel page hero — Canton Fair",
    brief:
      "Cinematic editorial photo of the Canton Fair exhibition complex — massive modern glass-roofed hall, buyers visible in scale.",
    composition: "Wide landscape (2:1).",
    width: 1920,
    height: 960,
    format: "jpg",
    current: "/china/pages/travel-hero.jpg",
  },
  {
    key: "travel-canton-fair.jpg",
    section: "/travel",
    title: "Canton Fair booth meeting",
    brief: "Indian businessman talking with Chinese exhibitor at a Canton Fair booth, sample products on display.",
    composition: "Landscape.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/travel-canton-fair.jpg",
  },
  {
    key: "travel-yiwu.jpg",
    section: "/travel",
    title: "Travel page — Yiwu market",
    brief: "Two Indian business travelers walking through Yiwu market with sample bags and a catalog.",
    composition: "Landscape, wide aisle perspective.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/travel-yiwu.jpg",
  },
  {
    key: "travel-factory-tour.jpg",
    section: "/travel",
    title: "Factory tour — group of buyers",
    brief: "3–4 Indian businesspeople being guided through a modern Chinese factory by a Chinese factory manager.",
    composition: "Landscape.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/travel-factory-tour.jpg",
  },

  // ── Events page ────────────────────────────────────────────────────
  {
    key: "events-hero.jpg",
    section: "/events",
    title: "Events page hero",
    brief:
      "Premium business summit in India — modern convention center ballroom, well-dressed Indian audience, lit stage with LED screen.",
    composition: "Wide landscape (2:1).",
    width: 1920,
    height: 960,
    format: "jpg",
    current: "/china/pages/events-hero.jpg",
  },
  {
    key: "events-meetup.jpg",
    section: "/events",
    title: "Meetup networking",
    brief: "30–40 Indian entrepreneurs networking in a modern hotel conference room — small conversation groups, coffee in hand.",
    composition: "Landscape.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/events-meetup.jpg",
  },

  // ── Careers page ───────────────────────────────────────────────────
  {
    key: "careers-hero.jpg",
    section: "/careers",
    title: "Careers hero — Gurugram office",
    brief:
      "Open-plan startup office in Gurugram — diverse young Indian team working at laptops, standing at a whiteboard, plants and warm wood tones.",
    composition: "Wide landscape (2:1).",
    width: 1920,
    height: 960,
    format: "jpg",
    current: "/china/pages/careers-hero.jpg",
  },
  {
    key: "careers-team.jpg",
    section: "/careers",
    title: "Careers — small team huddle",
    brief: "6 Indian team members in a standing meeting around a whiteboard with a product roadmap sketched out.",
    composition: "Landscape.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/careers-team.jpg",
  },

  // ── Contact page ───────────────────────────────────────────────────
  {
    key: "contact-office.jpg",
    section: "/contact",
    title: "Contact — Gurugram office exterior",
    brief:
      "Exterior of a modern mid-rise commercial tower in Gurugram Cyber City at golden hour — glass facade, landscaped entrance.",
    composition: "Landscape (16:9).",
    width: 1600,
    height: 900,
    format: "jpg",
    current: "/china/pages/contact-office.jpg",
  },

  // ── About page ─────────────────────────────────────────────────────
  {
    key: "about-team.jpg",
    section: "/about",
    title: "About — full team photo",
    brief:
      "~15-person Indian startup team posing in a modern office, diverse mix, smart casual, founder in center. Forbes-team-photo style.",
    composition: "Landscape (16:9), staggered composition.",
    width: 1600,
    height: 900,
    format: "jpg",
    current: "/china/pages/about-team.jpg",
  },
  {
    key: "about-timeline.jpg",
    section: "/about",
    title: "About — founder on the ground",
    brief: "Mr. Suprans walking out of a Chinese factory with an Indian sourcing manager, both holding sample products. Golden-hour lighting.",
    composition: "Landscape.",
    width: 1200,
    height: 800,
    format: "jpg",
    current: "/china/pages/about-timeline.jpg",
  },

  // ── Brands / ecosystem ─────────────────────────────────────────────
  {
    key: "brands-hero.jpg",
    section: "/brands",
    title: "Brands page hero",
    brief:
      "A 4×3 grid of product-category icons (home decor, yoga, toys, ayurveda, gadgets, holiday, furniture, watches, etc.) glowing softly on a near-black background. Premium enterprise look.",
    composition: "Wide landscape (2.4:1).",
    width: 1920,
    height: 800,
    format: "jpg",
    current: "/china/pages/brands-hero.jpg",
  },
]

export const SECTIONS: string[] = Array.from(
  new Set(IMAGE_SLOTS.map((s) => s.section)),
)
