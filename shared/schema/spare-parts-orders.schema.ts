import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Status enums za rezervne delove
export const sparePartUrgencyEnum = z.enum([
  "normal",
  "high",
  "urgent",
]);

export const sparePartStatusEnum = z.enum([
  "pending",
  "approved",
  "ordered",
  "received",
  "delivered",
  "cancelled",
  "removed_from_ordering",
  "requested",
  "admin_ordered",
  "waiting_delivery",
  "available",
  "consumed",
  "assigned_to_partner",
  "partner_processing"
]);

export const sparePartWarrantyStatusEnum = z.enum([
  "u garanciji",
  "van garancije",
]);

export const sparePartRequesterTypeEnum = z.enum([
  "admin",
  "technician",
]);

export type SparePartUrgency = z.infer<typeof sparePartUrgencyEnum>;
export type SparePartStatus = z.infer<typeof sparePartStatusEnum>;
export type SparePartWarrantyStatus = z.infer<typeof sparePartWarrantyStatusEnum>;
export type SparePartRequesterType = z.infer<typeof sparePartRequesterTypeEnum>;

// Tabela za rezervne delove (spare parts orders)
export const sparePartOrders = pgTable("spare_part_orders", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id"),
  technicianId: integer("technician_id"),
  applianceId: integer("appliance_id"),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"),
  quantity: integer("quantity").notNull().default(1),
  description: text("description"),
  urgency: text("urgency").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  estimatedCost: text("estimated_cost"),
  actualCost: text("actual_cost"),
  supplierName: text("supplier_name"),
  orderDate: timestamp("order_date"),
  expectedDelivery: timestamp("expected_delivery"),
  receivedDate: timestamp("received_date"),
  adminNotes: text("admin_notes"),
  assignedToPartnerId: integer("assigned_to_partner_id"),
  assignedAt: timestamp("assigned_at"),
  assignedBy: integer("assigned_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serviceIdIdx: index("spare_part_orders_service_id_idx").on(table.serviceId),
  statusIdx: index("spare_part_orders_status_idx").on(table.status),
  assignedToPartnerIdx: index("spare_part_orders_assigned_to_partner_idx").on(table.assignedToPartnerId),
}));

export const insertSparePartOrderSchema = createInsertSchema(sparePartOrders).pick({
  serviceId: true,
  technicianId: true,
  applianceId: true,
  partName: true,
  partNumber: true,
  quantity: true,
  description: true,
  urgency: true,
  status: true,
  estimatedCost: true,
  actualCost: true,
  supplierName: true,
  orderDate: true,
  expectedDelivery: true,
  receivedDate: true,
  adminNotes: true,
  assignedToPartnerId: true,
  assignedAt: true,
  assignedBy: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj").optional(),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj").optional(),
  applianceId: z.number().int().positive("ID uređaja mora biti pozitivan broj").optional(),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(200, "Naziv dela je predugačak"),
  partNumber: z.string().max(100, "Kataloški broj je predugačak").or(z.literal("")).optional(),
  quantity: z.number().int().positive("Količina mora biti pozitivan broj"),
  description: z.string().max(500, "Opis je predugačak").or(z.literal("")).optional(),
  urgency: sparePartUrgencyEnum.default("normal"),
  status: sparePartStatusEnum.default("pending"),
  warrantyStatus: sparePartWarrantyStatusEnum,
  estimatedCost: z.string().max(50, "Procenjena cena je predugačka").or(z.literal("")).optional(),
  actualCost: z.string().max(50, "Stvarna cena je predugačka").or(z.literal("")).optional(),
  supplierName: z.string().max(100, "Naziv dobavljača je predugačak").or(z.literal("")).optional(),
  adminNotes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).optional(),
  assignedToPartnerId: z.number().int().positive("ID poslovnog partnera mora biti pozitivan broj").optional(),
  assignedBy: z.number().int().positive("ID admina mora biti pozitivan broj").optional(),
  isDelivered: z.boolean().default(false).optional(),
  deliveryConfirmedBy: z.number().int().positive().optional(),
  autoRemoveAfterDelivery: z.boolean().default(true).optional(),
  requesterType: sparePartRequesterTypeEnum.optional(),
  requesterUserId: z.number().int().positive("ID korisnika mora biti pozitivan broj").optional(),
  requesterName: z.string().max(100, "Ime korisnika je predugačko").or(z.literal("")).optional(),
});

export type InsertSparePartOrder = z.infer<typeof insertSparePartOrderSchema>;
export type SparePartOrder = typeof sparePartOrders.$inferSelect;
