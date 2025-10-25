import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * SCHEMA VERSION: 2025-10-25T06:05:00Z
 * Last update: Added emailVerified column for email verification system
 */
export const USERS_SCHEMA_VERSION = "2025-10-25T06:05:00Z";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default("customer").notNull(), // Promenjen default na customer
  technicianId: integer("technician_id"), // Reference to technician if user is a technician
  supplierId: integer("supplier_id"), // Reference to supplier if user is a supplier
  email: text("email"), // Email adresa korisnika
  emailVerified: boolean("email_verified").default(false).notNull(), // Da li je email verifikovan (korisnik potvrdio kod)
  phone: text("phone"), // Broj telefona korisnika
  address: text("address"), // Adresa korisnika
  city: text("city"), // Grad korisnika
  companyName: text("company_name"), // Naziv kompanije za poslovne partnere
  companyId: text("company_id"), // Jedinstveni identifikator kompanije
  isVerified: boolean("is_verified").default(false).notNull(), // Da li je korisnik verifikovan od strane administratora
  registeredAt: timestamp("registered_at").defaultNow().notNull(), // Datum i vreme registracije
  verifiedAt: timestamp("verified_at"), // Datum i vreme kada je korisnik verifikovan
  verifiedBy: integer("verified_by"), // ID administratora koji je verifikovao korisnika
}, (table) => ({
  // Indeksi za brze pretrage
  usernameIdx: index("users_username_idx").on(table.username),
  roleIdx: index("users_role_idx").on(table.role),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  technicianId: true,
  supplierId: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  companyName: true,
  companyId: true,
  isVerified: true,
}).extend({
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera").max(50, "Korisničko ime je predugačko"),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime i prezime je predugačko"),
  email: z.string().email("Unesite validnu email adresu").min(1, "Email adresa je obavezna"),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()-]{6,20}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()-")
    .or(z.literal("")).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Technicians/Servicemen table
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  specialization: text("specialization"),
  active: boolean("active").default(true).notNull(),
});

export const insertTechnicianSchema = createInsertSchema(technicians).pick({
  fullName: true,
  phone: true,
  email: true,
  specialization: true,
  active: true,
});

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// Tabela za anti-bot mehanizam (jednostavan matematički zadatak)
export const botVerification = pgTable("bot_verification", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  question: text("question").notNull(), // "5 + 3 = ?"
  correctAnswer: integer("correct_answer").notNull(), // 8
  userAnswer: integer("user_answer"),
  verified: boolean("verified").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Važi 10 minuta
});

export const insertBotVerificationSchema = createInsertSchema(botVerification).pick({
  sessionId: true,
  question: true,
  correctAnswer: true,
  userAnswer: true,
  verified: true,
  attempts: true,
  expiresAt: true
});

export type InsertBotVerification = z.infer<typeof insertBotVerificationSchema>;
export type BotVerification = typeof botVerification.$inferSelect;

// Tabela za email verifikaciju
export const emailVerification = pgTable("email_verification", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  verificationCode: text("verification_code").notNull(), // Nasumični kod (6 cifara)
  used: boolean("used").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Važi 15 minuta
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerification).pick({
  email: true,
  verificationCode: true,
  used: true,
  attempts: true,
  expiresAt: true
});

export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type EmailVerification = typeof emailVerification.$inferSelect;

// Tabela za password reset (resetovanje lozinke)
export const passwordReset = pgTable("password_reset", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  resetCode: text("reset_code").notNull(), // Nasumični kod (6 cifara)
  used: boolean("used").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Važi 30 minuta
}, (table) => ({
  emailIdx: index("password_reset_email_idx").on(table.email),
}));

export const insertPasswordResetSchema = createInsertSchema(passwordReset).pick({
  email: true,
  resetCode: true,
  used: true,
  attempts: true,
  expiresAt: true
});

export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = typeof passwordReset.$inferSelect;
