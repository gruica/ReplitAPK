import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Email Management Tables
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  accountName: text("account_name").notNull(),
  email: text("email").notNull(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpSecure: boolean("smtp_secure").default(true).notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull(),
  imapSecure: boolean("imap_secure").default(true).notNull(),
  imapUser: text("imap_user").notNull(),
  imapPassword: text("imap_password").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  messageId: text("message_id").notNull(),
  subject: text("subject").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddresses: text("to_addresses").notNull(),
  ccAddresses: text("cc_addresses"),
  bccAddresses: text("bcc_addresses"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  attachments: text("attachments"),
  direction: text("direction").notNull(),
  status: text("status").default("unread").notNull(),
  priority: text("priority").default("normal").notNull(),
  isImportant: boolean("is_important").default(false).notNull(),
  relatedServiceId: integer("related_service_id"),
  relatedClientId: integer("related_client_id"),
  tags: text("tags"),
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
  repliedAt: timestamp("replied_at"),
});

export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  participants: text("participants").notNull(),
  lastMessageAt: timestamp("last_message_at").notNull(),
  messageCount: integer("message_count").default(1).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  relatedServiceId: integer("related_service_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  downloadUrl: text("download_url"),
  isInline: boolean("is_inline").default(false).notNull(),
  contentId: text("content_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email schema validacije
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).pick({
  accountName: true,
  email: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUser: true,
  smtpPassword: true,
  imapHost: true,
  imapPort: true,
  imapSecure: true,
  imapUser: true,
  imapPassword: true,
  isActive: true,
  createdBy: true,
}).extend({
  accountName: z.string().min(3, "Naziv naloga mora imati najmanje 3 karaktera").max(100, "Naziv je predugačak"),
  email: z.string().email("Unesite validnu email adresu"),
  smtpHost: z.string().min(3, "SMTP host mora imati najmanje 3 karaktera"),
  smtpPort: z.number().int().min(1).max(65535, "Port mora biti između 1 i 65535"),
  smtpUser: z.string().min(1, "SMTP korisničko ime je obavezno"),
  smtpPassword: z.string().min(1, "SMTP lozinka je obavezna"),
  imapHost: z.string().min(3, "IMAP host mora imati najmanje 3 karaktera"),
  imapPort: z.number().int().min(1).max(65535, "Port mora biti između 1 i 65535"),
  imapUser: z.string().min(1, "IMAP korisničko ime je obavezno"),
  imapPassword: z.string().min(1, "IMAP lozinka je obavezna"),
  createdBy: z.number().int().positive("ID kreatora mora biti pozitivan broj"),
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).pick({
  accountId: true,
  messageId: true,
  subject: true,
  fromAddress: true,
  toAddresses: true,
  ccAddresses: true,
  bccAddresses: true,
  bodyText: true,
  bodyHtml: true,
  attachments: true,
  direction: true,
  status: true,
  priority: true,
  isImportant: true,
  relatedServiceId: true,
  relatedClientId: true,
  tags: true,
  receivedAt: true,
}).extend({
  accountId: z.number().int().positive("ID naloga mora biti pozitivan broj"),
  messageId: z.string().min(1, "ID poruke je obavezan"),
  subject: z.string().min(1, "Naslov poruke je obavezan").max(255, "Naslov je predugačak"),
  fromAddress: z.string().email("Pošaljalac mora biti validna email adresa"),
  toAddresses: z.string().min(1, "Primaoci su obavezni"),
  direction: z.enum(["incoming", "outgoing"]),
  status: z.enum(["unread", "read", "replied", "forwarded", "archived"]).default("unread"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  receivedAt: z.date(),
});

export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type EmailThread = typeof emailThreads.$inferSelect;
export type EmailAttachment = typeof emailAttachments.$inferSelect;
