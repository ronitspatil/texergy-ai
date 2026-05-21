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

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Please enter a valid email.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email."),
  source: z.string().trim().max(40).optional(),
  // Honeypot — same pattern as waitlist.
  website: z.string().max(200).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

export const recommendSchema = z.object({
  zip: z.string().trim().regex(/^\d{5}$/, "ZIP must be 5 digits."),
  monthlyUsageKwh: z.number().int().min(50).max(20_000).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  weights: z
    .object({
      cost: z.number().min(0).max(1).optional(),
      renewable: z.number().min(0).max(1).optional(),
      contractFlexibility: z.number().min(0).max(1).optional(),
      rateStability: z.number().min(0).max(1).optional(),
      billTransparency: z.number().min(0).max(1).optional(),
      historicalPricing: z.number().min(0).max(1).optional(),
      weatherForecast: z.number().min(0).max(1).optional(),
    })
    .optional(),
  devices: z
    .array(z.enum(["thermostat", "ev", "solar", "storage"]))
    .max(8)
    .optional(),
  filters: z
    .object({
      rateType: z.enum(["Fixed", "Variable"]).optional(),
      minRenewablePct: z.number().int().min(0).max(100).optional(),
      maxTermMonths: z.number().int().min(0).max(120).optional(),
      prepaidOnly: z.boolean().optional(),
      excludePrepaid: z.boolean().optional(),
      maxMonthlyBill: z.number().min(0).optional(),
      timeOfUseOnly: z.boolean().optional(),
      excludeTimeOfUse: z.boolean().optional(),
      providerIds: z.array(z.number().int()).max(100).optional(),
      maxBaseCharge: z.number().min(0).max(50).optional(),
      maxEtf: z.number().min(0).max(1000).optional(),
    })
    .optional(),
});

export type RecommendBody = z.infer<typeof recommendSchema>;
