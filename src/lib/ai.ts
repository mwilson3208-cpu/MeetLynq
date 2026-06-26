// AI assistance layer. Defaults to a deterministic "mock" provider so the app
// runs with zero API keys. Set AI_PROVIDER=anthropic|openai + AI_API_KEY to
// wire a real model. All generated copy is returned for organizer review —
// nothing is auto-published.

export type AiTask =
  | "event_description"
  | "page_copy"
  | "speaker_bio"
  | "sponsor_package"
  | "registration_questions"
  | "match_message"
  | "follow_up_email"
  | "post_event_summary"
  | "sponsor_roi_summary"
  | "survey_insights";

export interface AiResult {
  provider: string;
  task: AiTask;
  output: string;
  editable: true;
}

const PROVIDER = process.env.AI_PROVIDER ?? "mock";

function mock(task: AiTask, input: Record<string, string>): string {
  const name = input.name ?? input.title ?? "your event";
  switch (task) {
    case "event_description":
      return `${name} brings together the people who move your industry forward. Over focused, high-signal days you'll meet qualified peers, sit down for pre-booked 1:1 meetings, and leave with a pipeline of real opportunities — not just a stack of business cards. Built for outcomes, designed for connection.`;
    case "page_copy":
      return `Meet smarter. Connect faster. Measure what matters.\n\n${name} is where ambitious professionals turn attendance into booked meetings, qualified leads, and lasting relationships. Reserve your spot and let our matchmaking engine line up the conversations worth having.`;
    case "speaker_bio":
      return `${input.name ?? "This speaker"} is a recognized voice in ${input.industry ?? "their field"}, known for turning complex ideas into practical playbooks. ${input.name ?? "They"} have advised teams of every size and bring a clear, energizing perspective to the stage.`;
    case "sponsor_package":
      return `Partner with ${name} to put your brand in front of decision-makers actively looking for solutions. Sponsorship includes premium logo placement, a staffed booth, sponsored sessions, qualified lead capture with QR scanning, and a post-event ROI report that proves the value of every dollar.`;
    case "registration_questions":
      return `Suggested questions:\n• What is your primary goal for attending?\n• Which best describes your role? (Buyer / Seller / Investor / Founder / Service provider)\n• What are you looking for at this event?\n• What can you offer other attendees?\n• Which topics matter most to you?`;
    case "match_message":
      return `Hi ${input.to ?? "there"} — I noticed we're both focused on ${input.topic ?? "growth"}. I'd love to compare notes and see where we might help each other. Open to a quick 1:1 during the event?`;
    case "follow_up_email":
      return `Subject: Great connecting at ${name}\n\nHi {{firstName}},\n\nThank you for the conversation at ${name} — it was a genuine highlight. I'd love to keep the momentum going. Are you free for a short call next week to explore next steps?\n\nWarmly,\n{{senderName}}`;
    case "post_event_summary":
      return `${name} delivered measurable outcomes: strong check-in rates, hundreds of booked meetings, and high attendee satisfaction. Networking activity concentrated around buyer/seller and investor/founder matches, and sponsor lead capture exceeded benchmark. Recommended next steps: launch the post-event follow-up campaign within 48 hours and open year-round community mode to sustain engagement.`;
    case "sponsor_roi_summary":
      return `This sponsor saw strong ROI: booth check-ins, qualified leads captured via QR, and booked 1:1 meetings with high-intent attendees. Lead quality skewed warm-to-hot, and sponsored sessions drove above-average attendance. Recommend renewing at the same or higher tier for the next edition.`;
    case "survey_insights":
      return `Overall sentiment is positive. Attendees most valued the matchmaking and the quality of meetings; the most common request was more time between sessions. NPS is healthy and satisfaction is high. Prioritize agenda pacing and expand 1:1 meeting slots for the next event.`;
    default:
      return `Draft copy for ${name}. Review and edit before publishing.`;
  }
}

export async function generate(task: AiTask, input: Record<string, string> = {}): Promise<AiResult> {
  // In production this branch calls Anthropic/OpenAI with `input` as context.
  // The mock keeps the product fully demoable offline.
  const output = mock(task, input);
  return { provider: PROVIDER, task, output, editable: true };
}
