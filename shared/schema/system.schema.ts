import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela za praćenje zahteva korisnika (rate limiting)
export const requestTracking = pgTable("request_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestType: text("request_type").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  successful: boolean("successful").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRequestTrackingSchema = createInsertSchema(requestTracking).pick({
  userId: true,
  requestType: true,
  ipAddress: true,
  userAgent: true,
  requestDate: true,
  successful: true
});

export type InsertRequestTracking = z.infer<typeof insertRequestTrackingSchema>;
export type RequestTracking = typeof requestTracking.$inferSelect;

// Data deletion requests
export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  reason: text("reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
  adminNotes: text("admin_notes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;

// Service Audit Logs
export const serviceAuditLogs = pgTable("service_audit_logs", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  action: text("action").notNull(),
  performedBy: integer("performed_by").notNull(),
  performedByUsername: text("performed_by_username").notNull(),
  performedByRole: text("performed_by_role").notNull(),
  oldValues: text("old_values"),
  newValues: text("new_values"),  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  notes: text("notes"),
});

export type ServiceAuditLog = typeof serviceAuditLogs.$inferSelect;

// User Permissions
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  canDeleteServices: boolean("can_delete_services").default(false).notNull(),
  canDeleteClients: boolean("can_delete_clients").default(false).notNull(),
  canDeleteAppliances: boolean("can_delete_appliances").default(false).notNull(),
  canViewAllServices: boolean("can_view_all_services").default(true).notNull(),
  canManageUsers: boolean("can_manage_users").default(false).notNull(),
  grantedBy: integer("granted_by"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  notes: text("notes"),
});

export type UserPermission = typeof userPermissions.$inferSelect;

// Deleted Services
export const deletedServices = pgTable("deleted_services", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().unique(),
  originalServiceData: text("original_service_data").notNull(),
  deletedBy: integer("deleted_by").notNull(),
  deletedByUsername: text("deleted_by_username").notNull(),
  deletedByRole: text("deleted_by_role").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  deleteReason: text("delete_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  canBeRestored: boolean("can_be_restored").default(true).notNull(),
  restoredBy: integer("restored_by"),
  restoredAt: timestamp("restored_at"),
});

export type DeletedService = typeof deletedServices.$inferSelect;

// Billing Configuration
export const billingConfig = pgTable("billing_config", {
  id: serial("id").primaryKey(),
  brandGroup: text("brand_group").notNull(),
  servicePrice: decimal("service_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  description: text("description"),
});

export type BillingConfig = typeof billingConfig.$inferSelect;

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  category: text("category").default("general").notNull(),
  isEncrypted: boolean("is_encrypted").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
