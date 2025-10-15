import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sparePartWarrantyStatusEnum } from "./spare-parts-orders.schema";

// Tabela za dostupne rezervne delove (available parts)
export const availableParts = pgTable("available_parts", {
  id: serial("id").primaryKey(),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"),
  quantity: integer("quantity").notNull().default(1),
  description: text("description"),
  supplierName: text("supplier_name"),
  unitCost: text("unit_cost"),
  location: text("location"),
  warrantyStatus: text("warranty_status").notNull(),
  categoryId: integer("category_id"),
  manufacturerId: integer("manufacturer_id"),
  originalOrderId: integer("original_order_id"),
  addedDate: timestamp("added_date").defaultNow().notNull(),
  addedBy: integer("added_by").notNull(),
  notes: text("notes"),
  serviceId: integer("service_id"),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  applianceInfo: text("appliance_info"),
  serviceDescription: text("service_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAvailablePartSchema = createInsertSchema(availableParts).pick({
  partName: true,
  partNumber: true,
  quantity: true,
  description: true,
  supplierName: true,
  unitCost: true,
  location: true,
  warrantyStatus: true,
  categoryId: true,
  manufacturerId: true,
  originalOrderId: true,
  addedBy: true,
  notes: true,
  serviceId: true,
  clientName: true,
  clientPhone: true,
  applianceInfo: true,
  serviceDescription: true,
}).extend({
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(200, "Naziv dela je predugačak"),
  partNumber: z.string().max(100, "Kataloški broj je predugačak").or(z.literal("")).optional(),
  quantity: z.number().int().positive("Količina mora biti pozitivan broj"),
  description: z.string().max(500, "Opis je predugačak").or(z.literal("")).optional(),
  supplierName: z.string().max(100, "Naziv dobavljača je predugačak").or(z.literal("")).optional(),
  unitCost: z.string().max(50, "Cena je predugačka").or(z.literal("")).optional(),
  location: z.string().max(100, "Lokacija je predugačka").or(z.literal("")).optional(),
  warrantyStatus: sparePartWarrantyStatusEnum,
  categoryId: z.number().int().positive("ID kategorije mora biti pozitivan broj").optional(),
  manufacturerId: z.number().int().positive("ID proizvođača mora biti pozitivan broj").optional(),
  originalOrderId: z.number().int().positive("ID originalne porudžbine mora biti pozitivan broj").optional(),
  addedBy: z.number().int().positive("ID korisnika mora biti pozitivan broj"),
  notes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).optional(),
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj").optional(),
  clientName: z.string().max(200, "Ime klijenta je predugačko").or(z.literal("")).optional(),
  clientPhone: z.string().max(50, "Telefon klijenta je predugačak").or(z.literal("")).optional(),
  applianceInfo: z.string().max(300, "Informacije o aparatu su predugačke").or(z.literal("")).optional(),
  serviceDescription: z.string().max(500, "Opis servisa je predugačak").or(z.literal("")).optional(),
});

export type InsertAvailablePart = z.infer<typeof insertAvailablePartSchema>;
export type AvailablePart = typeof availableParts.$inferSelect;

// Parts Activity Log - tabela za praćenje aktivnosti rezervnih delova
export const partsActivityLog = pgTable("parts_activity_log", {
  id: serial("id").primaryKey(),
  partId: integer("part_id"),
  action: text("action").notNull(),
  previousQuantity: integer("previous_quantity"),
  newQuantity: integer("new_quantity"),
  technicianId: integer("technician_id"),
  serviceId: integer("service_id"),
  userId: integer("user_id").notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type PartsActivityLog = typeof partsActivityLog.$inferSelect;

// Parts Allocations - tabela za praćenje dodele delova serviserima
export const partsAllocations = pgTable("parts_allocations", {
  id: serial("id").primaryKey(),
  availablePartId: integer("available_part_id").notNull(),
  serviceId: integer("service_id").notNull(),
  technicianId: integer("technician_id").notNull(),
  allocatedQuantity: integer("allocated_quantity").notNull(),
  allocatedBy: integer("allocated_by").notNull(),
  allocationNotes: text("allocation_notes"),
  status: text("status").notNull().default("allocated"),
  allocatedDate: timestamp("allocated_date").defaultNow().notNull(),
  usedDate: timestamp("used_date"),
  returnedDate: timestamp("returned_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PartsAllocation = typeof partsAllocations.$inferSelect;
