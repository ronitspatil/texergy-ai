import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Please enter a valid email.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email."),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "ZIP must be 5 digits.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  referrer: z.string().trim().max(120).optional(),
  // Honeypot — accept anything (we silently succeed in the route if it's filled).
  // Cap length so bots can't blast huge payloads at us.
  website: z.string().max(200).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
