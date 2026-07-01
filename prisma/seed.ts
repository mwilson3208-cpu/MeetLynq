import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// deterministic pseudo-random for repeatable seeds
let seedN = 7;
function rand(max: number) {
  seedN = (seedN * 1103515245 + 12345) & 0x7fffffff;
  return seedN % max;
}
function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

const FIRST = ["Maya", "Daniel", "Priya", "Marcus", "Sofia", "Liam", "Amara", "Noah", "Elena", "Kai", "Zara", "Owen", "Lucia", "Ethan", "Nadia", "Theo", "Ingrid", "Diego", "Hana", "Felix", "Aisha", "Jonas", "Vera", "Omar"];
const LAST = ["Chen", "Okafor", "Sharma", "Reyes", "Lindqvist", "Murphy", "Diallo", "Kim", "Rossi", "Tanaka", "Haddad", "Novak", "Santos", "Becker", "Petrov", "Adeyemi", "Olsen", "Garcia", "Yamamoto", "Schmidt"];
const COMPANIES = ["Northwind Labs", "Lumen Capital", "Vertex Health", "Orbit Robotics", "Cedar & Co", "BrightPath AI", "Harbor Logistics", "Quanta Bio", "Meridian Studios", "Atlas Ventures", "Solace Energy", "Pulse Fintech", "Verdant Foods", "Cobalt Security", "Nimbus Cloud"];
const INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "Manufacturing", "Energy", "Media", "Logistics", "Biotech", "Retail", "Education"];
const TITLES = ["Founder & CEO", "VP Sales", "Head of Partnerships", "Investor", "Product Lead", "CTO", "Marketing Director", "Managing Partner", "Operations Lead", "Business Development"];
const CITIES = [["Austin", "USA"], ["Berlin", "Germany"], ["Singapore", "Singapore"], ["Toronto", "Canada"], ["London", "UK"], ["Lisbon", "Portugal"]];
const INTERESTS = ["AI", "GTM", "Fundraising", "Partnerships", "Hiring", "Growth", "Product", "Sales", "Community", "Sustainability"];

async function main() {
  console.log("Seeding MeetLynq…");

  await db.user.deleteMany();
  await db.organization.deleteMany();

  const owner = await db.user.create({
    data: {
      email: "organizer@meetlynq.com",
      name: "Avery Bennett",
      passwordHash: hashPassword("password123"),
      role: "ORGANIZER",
      emailVerified: true,
      avatarUrl: null,
    },
  });

  const admin = await db.user.create({
    data: {
      email: "admin@meetlynq.com",
      name: "Platform Admin",
      passwordHash: hashPassword("password123"),
      role: "PLATFORM_ADMIN",
      emailVerified: true,
    },
  });

  const org = await db.organization.create({
    data: {
      name: "Summit Collective",
      slug: "summit-collective",
      plan: "GROWTH",
      brandColor: "#4f46e5",
      website: "https://summitcollective.example",
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: admin.id, role: "ADMIN" },
        ],
      },
      integrations: {
        create: [
          { provider: "hubspot", status: "CONNECTED" },
          { provider: "salesforce", status: "DISCONNECTED" },
          { provider: "zapier", status: "CONNECTED" },
          { provider: "airtable", status: "DISCONNECTED" },
        ],
      },
      webhooks: {
        create: [{ url: "https://hooks.example/meetlynq", event: "registration.created" }],
      },
    },
  });

  // ---- Flagship event (fully populated) --------------------------------
  const start = new Date();
  start.setDate(start.getDate() + 21);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(17, 0, 0, 0);

  const event = await db.event.create({
    data: {
      organizationId: org.id,
      name: "GrowthScale Summit 2026",
      slug: "growthscale-summit-2026",
      tagline: "Where revenue leaders meet the people who move the needle.",
      description:
        "GrowthScale Summit brings together founders, investors, and revenue leaders for two days of high-signal connection. Pre-booked 1:1 meetings, curated matchmaking, and outcomes you can measure.",
      type: "SUMMIT",
      status: "PUBLISHED",
      format: "HYBRID",
      startsAt: start,
      endsAt: end,
      timezone: "America/Chicago",
      venueName: "Riverside Convention Center",
      venueAddress: "500 River St",
      city: "Austin",
      country: "USA",
      brandColor: "#4f46e5",
      seoTitle: "GrowthScale Summit 2026 — Meet smarter",
      seoDescription: "Two days of curated matchmaking, 1:1 meetings, and measurable outcomes.",
      capacity: 600,
      matchRules: JSON.stringify({ allowBuyerSeller: true, allowInvestorFounder: true, minScore: 40 }),
    },
  });

  // Pages + sections
  const home = await db.eventPage.create({
    data: { eventId: event.id, key: "home", title: "Home", isHome: true, published: true, navOrder: 0 },
  });
  await db.eventSection.createMany({
    data: [
      { pageId: home.id, type: "hero", order: 0, config: JSON.stringify({ heading: event.name, sub: event.tagline, cta: "Register now" }) },
      { pageId: home.id, type: "richtext", order: 1, config: JSON.stringify({ body: event.description }) },
      { pageId: home.id, type: "speakers", order: 2, config: JSON.stringify({ heading: "Featured speakers" }) },
      { pageId: home.id, type: "sponsors", order: 3, config: JSON.stringify({ heading: "Our sponsors" }) },
      { pageId: home.id, type: "tickets", order: 4, config: JSON.stringify({ heading: "Get your pass" }) },
    ],
  });
  for (const [key, title, order] of [
    ["agenda", "Agenda", 1],
    ["speakers", "Speakers", 2],
    ["sponsors", "Sponsors", 3],
    ["tickets", "Tickets", 4],
  ] as const) {
    await db.eventPage.create({ data: { eventId: event.id, key, title, published: true, navOrder: order } });
  }

  // Tickets
  const general = await db.ticket.create({
    data: { eventId: event.id, name: "General Admission", type: "PAID", priceCents: 49900, quantity: 400, sold: 0, earlyBird: true, earlyBirdPriceCents: 39900, description: "Full two-day access, matchmaking, and 1:1 meetings." },
  });
  const vip = await db.ticket.create({
    data: { eventId: event.id, name: "VIP Pass", type: "VIP", priceCents: 99900, quantity: 80, sold: 0, description: "Everything in General plus VIP lounge, priority meetings, and speaker dinner." },
  });
  const free = await db.ticket.create({
    data: { eventId: event.id, name: "Expo Only (Free)", type: "FREE", priceCents: 0, quantity: 200, sold: 0, requiresApproval: true, description: "Access to the expo floor and marketplace." },
  });
  await db.coupon.create({ data: { eventId: event.id, code: "EARLY25", percentOff: 25, maxRedemptions: 100 } });
  await db.coupon.create({ data: { eventId: event.id, code: "PARTNER50", amountOffCents: 5000 } });

  // Tracks
  const tracks = await Promise.all(
    [
      ["Revenue", "#4f46e5"],
      ["Product", "#0891b2"],
      ["Capital", "#16a34a"],
    ].map(([name, color]) => db.sessionTrack.create({ data: { eventId: event.id, name, color } }))
  );

  // Speakers + sessions
  const sessionDay = new Date(start);
  for (let i = 0; i < 8; i++) {
    const fn = pick(FIRST);
    const ln = pick(LAST);
    const speaker = await db.speaker.create({
      data: {
        eventId: event.id,
        name: `${fn} ${ln}`,
        title: pick(TITLES),
        companyName: pick(COMPANIES),
        bio: `${fn} is a recognized leader in ${pick(INDUSTRIES)}, helping teams turn strategy into measurable growth.`,
        sessionTitle: pick(["Scaling Revenue Without Scaling Chaos", "The New Rules of B2B Matchmaking", "From Attendance to Pipeline", "Fundraising in a Tighter Market", "Building a Year-Round Community"]),
        featured: i < 4,
        qaModeration: true,
      },
    });
    const startsAt = new Date(sessionDay);
    startsAt.setHours(10 + (i % 6), (i % 2) * 30, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + 45);
    await db.session.create({
      data: {
        eventId: event.id,
        trackId: pick(tracks).id,
        speakerId: speaker.id,
        title: speaker.sessionTitle ?? "Session",
        description: "A practical, high-signal session with takeaways you can apply immediately.",
        startsAt,
        endsAt,
        room: pick(["Hall A", "Hall B", "Studio 1", "Studio 2"]),
        capacity: 120,
        format: pick(["TALK", "PANEL", "WORKSHOP", "KEYNOTE"]),
        streamUrl: "https://stream.example/live",
      },
    });
  }

  // Companies, sponsors, exhibitors
  const companies = [];
  for (let i = 0; i < 10; i++) {
    const c = await db.company.create({
      data: {
        eventId: event.id,
        name: COMPANIES[i % COMPANIES.length],
        industry: pick(INDUSTRIES),
        description: "We help modern teams grow faster with less friction.",
        website: "https://example.com",
        products: "Platform, services, and advisory.",
        lookingFor: pick(["Channel partners", "Enterprise buyers", "Investors", "Talent"]),
        offering: pick(["SaaS platform", "Advisory", "Capital", "Integrations"]),
        boothNumber: `B${10 + i}`,
      },
    });
    companies.push(c);
  }
  const levels = ["PLATINUM", "GOLD", "GOLD", "SILVER", "BRONZE"];
  for (let i = 0; i < 5; i++) {
    await db.sponsor.create({
      data: {
        eventId: event.id,
        companyId: companies[i].id,
        name: companies[i].name,
        level: levels[i],
        description: "Proud sponsor powering meaningful connections at GrowthScale.",
        website: "https://example.com",
        valueScore: 60 + rand(40),
      },
    });
  }
  for (let i = 5; i < 9; i++) {
    await db.exhibitor.create({
      data: {
        eventId: event.id,
        companyId: companies[i].id,
        name: companies[i].name,
        boothNumber: companies[i].boothNumber,
        description: "Visit our booth for a live demo and a chance to win.",
        website: "https://example.com",
      },
    });
  }

  // Registrations + participants + check-ins + badges
  const statuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "CHECKED_IN", "PENDING", "WAITLISTED", "CANCELED"];
  const participants: { id: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const fn = pick(FIRST);
    const ln = pick(LAST);
    const email = `${fn}.${ln}.${i}@example.com`.toLowerCase();
    const status = i < 40 ? (i % 5 === 0 ? "CHECKED_IN" : "CONFIRMED") : pick(statuses);
    const ticket = pick([general, vip, free]);
    const reg = await db.registration.create({
      data: {
        eventId: event.id,
        ticketId: ticket.id,
        email,
        firstName: fn,
        lastName: ln,
        status,
        answers: JSON.stringify({ goal: pick(["Find customers", "Raise capital", "Hire", "Partnerships"]) }),
      },
    });
    if (status === "CHECKED_IN") {
      await db.checkIn.create({ data: { eventId: event.id, registrationId: reg.id, method: "QR", staffName: "Front Desk" } });
      await db.badge.create({ data: { eventId: event.id, registrationId: reg.id, title: pick(TITLES), company: pick(COMPANIES) } });
    }
    if (status !== "CANCELED" && status !== "WAITLISTED") {
      const [city, country] = pick(CITIES);
      const p = await db.participant.create({
        data: {
          eventId: event.id,
          registrationId: reg.id,
          name: `${fn} ${ln}`,
          email,
          title: pick(TITLES),
          companyName: pick(COMPANIES),
          industry: pick(INDUSTRIES),
          location: `${city}, ${country}`,
          bio: `${fn} leads growth initiatives and is looking to build meaningful partnerships.`,
          goals: pick(["Close deals", "Meet investors", "Find partners", "Learn"]),
          lookingFor: pick(["Enterprise buyers", "Co-investors", "Channel partners", "Mentors"]),
          offering: pick(["A SaaS platform", "Capital", "Advisory", "Integration partnership"]),
          interestTags: JSON.stringify([pick(INTERESTS), pick(INTERESTS)]),
          website: "https://example.com",
          intentScore: 40 + rand(60),
        },
      });
      participants.push(p);
    }
    if (ticket.id === general.id) await db.ticket.update({ where: { id: general.id }, data: { sold: { increment: 1 } } });
    if (ticket.id === vip.id) await db.ticket.update({ where: { id: vip.id }, data: { sold: { increment: 1 } } });
    if (ticket.id === free.id) await db.ticket.update({ where: { id: free.id }, data: { sold: { increment: 1 } } });
  }

  // Orders + payments (for paid registrations summary)
  for (let i = 0; i < 25; i++) {
    const total = pick([39900, 49900, 99900]);
    const order = await db.order.create({
      data: {
        eventId: event.id,
        email: `buyer${i}@example.com`,
        subtotalCents: total,
        totalCents: total,
        status: "PAID",
      },
    });
    await db.payment.create({ data: { orderId: order.id, amountCents: total, status: "SUCCEEDED", providerRef: `pi_mock_${i}` } });
  }

  // Meeting locations + slots
  const locations = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((n) =>
      db.meetingLocation.create({ data: { eventId: event.id, name: `Table ${n}`, kind: "TABLE", capacity: 2 } })
    )
  );
  const slots = [];
  for (let h = 0; h < 6; h++) {
    const s = new Date(start);
    s.setHours(11 + h, 0, 0, 0);
    const e = new Date(s);
    e.setMinutes(20);
    slots.push(await db.meetingSlot.create({ data: { eventId: event.id, startsAt: s, endsAt: e, label: `Slot ${h + 1}` } }));
  }

  // Match scores + meetings + conversations
  const fits = ["BUYER_SELLER", "INVESTOR_FOUNDER", "SPONSOR_ATTENDEE", "PEER"];
  const mStatuses = ["REQUESTED", "APPROVED", "APPROVED", "COMPLETED", "DECLINED", "NO_SHOW"];
  for (let i = 0; i < Math.min(30, participants.length - 1); i++) {
    const a = participants[i];
    const b = participants[(i + 3) % participants.length];
    if (a.id === b.id) continue;
    await db.matchScore.create({
      data: {
        eventId: event.id,
        participantAId: a.id,
        participantBId: b.id,
        score: 55 + rand(45),
        reason: "Strong overlap in goals and complementary offerings.",
        mutualInterests: JSON.stringify([pick(INTERESTS), pick(INTERESTS)]),
        fitType: pick(fits),
        suggestedMessage: "I'd love to compare notes — open to a quick 1:1?",
        suggestedGoal: pick(["Explore partnership", "Discuss investment", "Scope a pilot"]),
      },
    });
    if (i < 18) {
      const status = pick(mStatuses);
      const meeting = await db.meeting.create({
        data: {
          eventId: event.id,
          slotId: pick(slots).id,
          locationId: pick(locations).id,
          type: "ONE_TO_ONE",
          status,
          mode: pick(["IN_PERSON", "ONLINE"]),
          goal: pick(["Explore partnership", "Discuss investment", "Scope a pilot"]),
          noShow: status === "NO_SHOW",
          participants: {
            create: [
              { participantId: a.id, role: "REQUESTER", response: "ACCEPTED" },
              { participantId: b.id, role: "INVITEE", response: status === "DECLINED" ? "DECLINED" : "ACCEPTED" },
            ],
          },
        },
      });
      if (status === "COMPLETED") {
        await db.rating.create({ data: { meetingId: meeting.id, kind: "MEETING", score: 4 + rand(2), comment: "Great conversation." } });
      }
    }
  }

  // Conversations
  for (let i = 0; i < 6; i++) {
    const a = participants[i];
    const b = participants[(i + 5) % participants.length];
    if (!a || !b || a.id === b.id) continue;
    const convo = await db.conversation.create({
      data: {
        eventId: event.id,
        kind: "PRIVATE",
        members: { create: [{ participantId: a.id }, { participantId: b.id }] },
        messages: {
          create: [
            { senderName: "You", body: "Hi! Loved your goals — want to grab a meeting?" },
            { senderName: "Them", body: "Absolutely, let's find a slot tomorrow." },
          ],
        },
      },
    });
    void convo;
  }

  // Marketplace posts
  for (let i = 0; i < 8; i++) {
    await db.marketplacePost.create({
      data: {
        eventId: event.id,
        authorName: `${pick(FIRST)} ${pick(LAST)}`,
        title: pick(["Looking for design partners", "Offering pilot pricing for startups", "Seeking seed investors", "Free workshop on GTM", "Hiring senior engineers", "Open to advisory roles"]),
        kind: pick(["OFFER", "NEED"]),
        category: pick(["Partnership", "Investment", "Hiring", "Services"]),
        description: "Reach out if this is a fit — happy to set up a quick meeting at the event.",
        keywords: JSON.stringify([pick(INTERESTS), pick(INTERESTS)]),
        sponsored: i < 2,
      },
    });
  }

  // Leads (sponsor/exhibitor pipeline)
  const sponsors = await db.sponsor.findMany({ where: { eventId: event.id } });
  for (let i = 0; i < 20; i++) {
    await db.lead.create({
      data: {
        eventId: event.id,
        sponsorId: pick(sponsors).id,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        email: `lead${i}@example.com`,
        company: pick(COMPANIES),
        source: pick(["BOOTH", "QR_SCAN", "MEETING", "SESSION"]),
        quality: pick(["HOT", "WARM", "WARM", "COLD"]),
        notes: "Met at booth, interested in enterprise plan.",
      },
    });
  }

  // Email campaigns
  await db.emailCampaign.createMany({
    data: [
      { eventId: event.id, name: "Registration confirmation", subject: "You're in! 🎉", segment: "REGISTERED", status: "SENT", recipients: 320, opens: 268, clicks: 142, sentAt: new Date() },
      { eventId: event.id, name: "Speaker announcement", subject: "Meet our headline speakers", segment: "ALL", status: "SENT", recipients: 540, opens: 401, clicks: 188, sentAt: new Date() },
      { eventId: event.id, name: "1 week to go", subject: "Your meetings are filling up", segment: "REGISTERED", status: "SCHEDULED", recipients: 0 },
      { eventId: event.id, name: "Post-event follow-up", subject: "Thanks for joining — your recap", segment: "CHECKED_IN", status: "DRAFT", recipients: 0 },
    ],
  });

  // Surveys
  const survey = await db.survey.create({
    data: {
      eventId: event.id,
      title: "Post-event satisfaction",
      kind: "POST_EVENT",
      status: "LIVE",
      questions: {
        create: [
          { prompt: "How likely are you to recommend this event?", type: "NPS", order: 0 },
          { prompt: "How would you rate the matchmaking?", type: "RATING", order: 1 },
          { prompt: "What could we improve?", type: "TEXT", order: 2 },
        ],
      },
    },
  });
  const q = await db.surveyQuestion.findFirst({ where: { surveyId: survey.id, type: "RATING" } });
  if (q) {
    for (let i = 0; i < 18; i++) {
      await db.surveyResponse.create({ data: { surveyId: survey.id, questionId: q.id, value: String(4 + rand(2)) } });
    }
  }

  // Reports
  await db.report.createMany({
    data: [
      { eventId: event.id, kind: "REVENUE", title: "Revenue report", data: JSON.stringify({ grossCents: 1845000 }) },
      { eventId: event.id, kind: "AI_SUMMARY", title: "AI post-event summary", data: JSON.stringify({ generated: true }) },
    ],
  });

  // ---- Two more lightweight events for the multi-event dashboard --------
  const e2start = new Date(start);
  e2start.setMonth(e2start.getMonth() + 2);
  await db.event.create({
    data: {
      organizationId: org.id,
      name: "Founder Mastermind Retreat",
      slug: "founder-mastermind-retreat",
      tagline: "An intimate mastermind for second-time founders.",
      type: "MASTERMIND",
      status: "DRAFT",
      format: "IN_PERSON",
      startsAt: e2start,
      endsAt: e2start,
      city: "Lisbon",
      country: "Portugal",
      capacity: 40,
    },
  });
  const e3start = new Date(start);
  e3start.setMonth(e3start.getMonth() - 3);
  const e3end = new Date(e3start);
  e3end.setDate(e3end.getDate() + 1);
  await db.event.create({
    data: {
      organizationId: org.id,
      name: "Capital Connect Expo 2025",
      slug: "capital-connect-expo-2025",
      tagline: "Investors and founders, matched.",
      type: "EXPO",
      status: "ENDED",
      format: "HYBRID",
      startsAt: e3start,
      endsAt: e3end,
      city: "Singapore",
      country: "Singapore",
      capacity: 800,
    },
  });

  console.log("Seed complete.");
  console.log("  Organizer login: organizer@meetlynq.com / password123");
  console.log("  Admin login:     admin@meetlynq.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

// keep import referenced for type tooling
void createHmac;
