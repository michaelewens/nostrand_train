import { z } from "zod";

export const departureSchema = z.object({
  route: z.enum(["A", "C"]),
  destination: z.string().min(1).max(80),
  arrivalTime: z.number().int().positive(),
});

export type Departure = z.infer<typeof departureSchema>;

export const displayTrainSchema = departureSchema.extend({
  minutes: z.number().int().nonnegative(),
});

export const weatherSchema = z.object({
  temperatureF: z.number().int().finite(),
  apparentF: z.number().int().finite(),
  highF: z.number().int().finite(),
  lowF: z.number().int().finite(),
  precipitationChance: z.number().int().min(0).max(100),
  condition: z.string().min(1).max(40),
  weatherCode: z.number().int().min(0).max(99),
});

export type Weather = z.infer<typeof weatherSchema>;

export const displayPayloadSchema = z.object({
  version: z.literal(1),
  station: z.object({
    name: z.string(),
    direction: z.string(),
    stopId: z.string(),
  }),
  generatedAt: z.number().int().positive(),
  updated: z.string().min(1).max(20),
  stale: z.boolean(),
  trains: z.array(displayTrainSchema).max(4),
  weather: weatherSchema.nullable(),
});

export type DisplayPayload = z.infer<typeof displayPayloadSchema>;
