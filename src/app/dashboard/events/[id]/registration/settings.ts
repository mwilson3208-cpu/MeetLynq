// Registration-setup toggles that map to real Event boolean columns. Kept in a
// plain module (not the "use server" actions file, which may only export async
// functions) so both the server action and the page can import the allowlist.

export const REGISTRATION_SETTINGS = [
  "requireApproval",
  "waitlistEnabled",
  "conditionalFields",
  "groupRegistration",
] as const;

export type RegistrationSettingKey = (typeof REGISTRATION_SETTINGS)[number];

export type ToggleState = { ok?: boolean; error?: string } | null;
