import { pgTable, text, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
}, (table) => ({
  // Indeksi za brze pretrage po telefonu i email-u
  phoneIdx: index("clients_phone_idx").on(table.phone),
  emailIdx: index("clients_email_idx").on(table.email),
}));

// Poboljšana šema za validaciju klijenata sa detaljnijim pravilima
export const insertClientSchema = createInsertSchema(clients).pick({
  fullName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
}).extend({
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").or(z.literal("")).optional(),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()/-]{6,25}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()/-"),
  address: z.string().min(3, "Adresa mora imati najmanje 3 karaktera").or(z.literal("")).optional(),
  city: z.string().min(2, "Grad mora imati najmanje 2 karaktera").or(z.literal("")).optional(),
  notes: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
