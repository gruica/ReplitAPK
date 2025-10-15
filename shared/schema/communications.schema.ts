import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const messageTypeEnum = pgEnum("message_type", ["inquiry", "complaint", "request", "update", "urgent"]);
export const messageStatusEnum = pgEnum("message_status", ["unread", "read", "replied", "archived"]);
export const messagePriorityEnum = pgEnum("message_priority", ["low", "normal", "high", "urgent"]);

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
