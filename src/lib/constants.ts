// Enum-like constants. SQLite has no native enums; these document the allowed
// values for String columns and provide labels + badge tones for the UI.

export type Tone = "neutral" | "primary" | "success" | "warning" | "destructive" | "info";

export const USER_ROLES = {
  PLATFORM_ADMIN: "Platform admin",
  ORGANIZER: "Organizer",
  TEAM_MEMBER: "Team member",
  STAFF: "Check-in staff",
  ATTENDEE: "Attendee",
} as const;

export const ORG_PLANS = {
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
  ENTERPRISE: "Enterprise",
} as const;

export const EVENT_TYPES = {
  CONFERENCE: "Conference",
  EXPO: "Expo",
  TRADE_SHOW: "Trade show",
  NETWORKING: "Networking event",
  INVESTOR: "Investor event",
  MASTERMIND: "Mastermind",
  SUMMIT: "Business summit",
  COMMUNITY: "Community event",
} as const;

export const EVENT_FORMATS = {
  IN_PERSON: "In-person",
  VIRTUAL: "Virtual",
  HYBRID: "Hybrid",
} as const;

export const EVENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Published", tone: "primary" },
  LIVE: { label: "Live", tone: "success" },
  ENDED: { label: "Ended", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const REGISTRATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "primary" },
  CHECKED_IN: { label: "Checked in", tone: "success" },
  CANCELED: { label: "Canceled", tone: "destructive" },
  WAITLISTED: { label: "Waitlisted", tone: "info" },
};

export const TICKET_TYPES = {
  FREE: "Free",
  PAID: "Paid",
  VIP: "VIP",
  GROUP: "Group",
} as const;

export const MEETING_STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  DECLINED: { label: "Declined", tone: "destructive" },
  RESCHEDULE: { label: "Reschedule", tone: "info" },
  COMPLETED: { label: "Completed", tone: "primary" },
  NO_SHOW: { label: "No-show", tone: "destructive" },
  CANCELED: { label: "Canceled", tone: "neutral" },
};

export const SPONSOR_LEVELS: Record<string, { label: string; tone: Tone }> = {
  PLATINUM: { label: "Platinum", tone: "info" },
  GOLD: { label: "Gold", tone: "warning" },
  SILVER: { label: "Silver", tone: "neutral" },
  BRONZE: { label: "Bronze", tone: "neutral" },
  PARTNER: { label: "Partner", tone: "primary" },
};

export const LEAD_QUALITY: Record<string, { label: string; tone: Tone }> = {
  HOT: { label: "Hot", tone: "destructive" },
  WARM: { label: "Warm", tone: "warning" },
  COLD: { label: "Cold", tone: "info" },
};

export const FIT_TYPES = {
  BUYER_SELLER: "Buyer / Seller",
  INVESTOR_FOUNDER: "Investor / Founder",
  SPONSOR_ATTENDEE: "Sponsor / Attendee",
  AUTHOR_READER: "Author / Reader",
  COACH_CLIENT: "Coach / Client",
  PEER: "Peer",
} as const;

export const CAMPAIGN_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SCHEDULED: { label: "Scheduled", tone: "info" },
  SENT: { label: "Sent", tone: "success" },
};

export function labelOf(map: Record<string, string>, key: string) {
  return map[key] ?? key;
}
