import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { services } from './services.schema';
import { users } from './users.schema';

export const messageTypeEnum = pgEnum("message_type", ["inquiry", "complaint", "request", "update", "urgent"]);
export const messageStatusEnum = pgEnum("message_status", ["unread", "read", "replied", "archived"]);
export const messagePriorityEnum = pgEnum("message_priority", ["low", "normal", "high", "urgent"]);

export const conversationMessageTypeEnum = pgEnum("conversation_message_type", ["whatsapp", "sms", "auto"]);
export const conversationMessageDirectionEnum = pgEnum("conversation_message_direction", ["outgoing", "incoming"]);
export const conversationDeliveryStatusEnum = pgEnum("conversation_delivery_status", ["sent", "delivered", "failed", "pending"]);

export const businessPartnerMessages = pgTable("business_partner_messages", {
  id: serial("id").primaryKey(),
  businessPartnerId: integer("business_partner_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").notNull(),
  priority: messagePriorityEnum("priority").notNull().default('normal'),
  status: messageStatusEnum("status").notNull().default('unread'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderCompany: text("sender_company").notNull(),
  senderPhone: text("sender_phone"),
  relatedServiceId: integer("related_service_id"),
  relatedClientName: text("related_client_name"),
  attachments: text("attachments").array(),
  adminResponse: text("admin_response"),
  adminRespondedAt: timestamp("admin_responded_at"),
  adminRespondedBy: text("admin_responded_by"),
});

export type BusinessPartnerMessage = typeof businessPartnerMessages.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedServiceId: integer("related_service_id"),
  relatedSparePartId: integer("related_spare_part_id"),
  relatedUserId: integer("related_user_id"),
  isRead: boolean("is_read").default(false).notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

export type Notification = typeof notifications.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  relatedServiceId: true,
  relatedSparePartId: true,
  relatedUserId: true,
  priority: true,
}).extend({
  userId: z.number().int().positive("ID korisnika mora biti pozitivan broj"),
  type: z.string().min(1, "Tip notifikacije je obavezan"),
  title: z.string().min(1, "Naslov je obavezan"),
  message: z.string().min(1, "Poruka je obavezna"),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientPhone: text("recipient_phone").notNull(),
  messageType: conversationMessageTypeEnum("message_type").notNull(),
  messageContent: text("message_content").notNull(),
  mediaUrl: text("media_url"),
  messageDirection: conversationMessageDirectionEnum("message_direction").notNull().default('outgoing'),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveryStatus: conversationDeliveryStatusEnum("delivery_status").notNull().default('pending'),
  messageId: text("message_id"),
  relatedUserId: integer("related_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).pick({
  serviceId: true,
  senderId: true,
  recipientPhone: true,
  messageType: true,
  messageContent: true,
  mediaUrl: true,
  messageDirection: true,
  deliveryStatus: true,
  messageId: true,
  relatedUserId: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  senderId: z.number().int().positive("ID pošaljaoca mora biti pozitivan broj"),
  recipientPhone: z.string().min(8, "Broj telefona mora imati najmanje 8 karaktera").max(20, "Broj telefona je predugačak"),
  messageType: z.enum(["whatsapp", "sms", "auto"]),
  messageContent: z.string().min(1, "Sadržaj poruke je obavezan").max(2000, "Poruka je predugačka"),
  mediaUrl: z.string().url("URL mora biti validan").or(z.literal("")).nullable().optional(),
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
