import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela za održavanje uređaja
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  applianceId: integer("appliance_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency", { enum: ["monthly", "quarterly", "biannual", "annual", "custom"] }).notNull(),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date").notNull(),
  customIntervalDays: integer("custom_interval_days"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).pick({
  applianceId: true,
  name: true,
  description: true,
  frequency: true,
  lastMaintenanceDate: true,
  nextMaintenanceDate: true,
  customIntervalDays: true,
  isActive: true
});

export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

// Tabela za obaveštenja o održavanju
export const maintenanceAlerts = pgTable("maintenance_alerts", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  status: text("status", { enum: ["pending", "sent", "acknowledged", "completed"] }).default("pending").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceAlertSchema = createInsertSchema(maintenanceAlerts).pick({
  scheduleId: true,
  title: true,
  message: true,
  alertDate: true,
  status: true,
  isRead: true
});

export type InsertMaintenanceAlert = z.infer<typeof insertMaintenanceAlertSchema>;
export type MaintenanceAlert = typeof maintenanceAlerts.$inferSelect;

// Maintenance Requests - zahtevi poslovnih partnera
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  businessPartnerId: integer("business_partner_id").notNull(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  serviceAddress: text("service_address").notNull(),
  applianceType: text("appliance_type").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  problemDescription: text("problem_description").notNull(),
  warrantyStatus: text("warranty_status").notNull(),
  urgency: text("urgency").default("normal").notNull(),
  preferredDate: text("preferred_date"),
  status: text("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  assignedTechnicianId: integer("assigned_technician_id"),
  createdServiceId: integer("created_service_id"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  processedDate: timestamp("processed_date"),
  processedBy: integer("processed_by"),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).pick({
  businessPartnerId: true,
  companyName: true,
  contactPerson: true,
  contactEmail: true,
  contactPhone: true,
  serviceAddress: true,
  applianceType: true,
  manufacturer: true,
  model: true,
  serialNumber: true,
  problemDescription: true,
  warrantyStatus: true,
  urgency: true,
  preferredDate: true,
  adminNotes: true,
});

export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
