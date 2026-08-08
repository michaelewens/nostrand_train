import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// NYC Subway Departure Types
export const departureSchema = z.object({
  route: z.string(),
  destination: z.string(),
  arrivalTime: z.number(), // Unix timestamp
});

export type Departure = z.infer<typeof departureSchema>;

export const displayTrainSchema = departureSchema.extend({
  minutes: z.number().int().nonnegative(),
});

export const weatherSchema = z.object({
  temperatureF: z.number(),
  apparentF: z.number(),
  highF: z.number(),
  lowF: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  weatherCode: z.number(),
});

export const displayPayloadSchema = z.object({
  version: z.literal(1),
  station: z.object({
    name: z.string(),
    direction: z.string(),
    stopId: z.string(),
  }),
  generatedAt: z.number(),
  updated: z.string(),
  trains: z.array(displayTrainSchema),
  weather: weatherSchema.nullable(),
});

export type DisplayPayload = z.infer<typeof displayPayloadSchema>;
