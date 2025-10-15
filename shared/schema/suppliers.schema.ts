import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela za upravljanje dobavljačima rezervnih delova
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  supportedBrands: text("supported_brands"),
  integrationMethod: text("integration_method", { 
    enum: ["email", "api", "fax", "manual"] 
  }).default("email").notNull(),
  paymentTerms: text("payment_terms"),
  deliveryInfo: text("delivery_info"),
  contactPerson: text("contact_person"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(5).notNull(),
  averageDeliveryDays: integer("average_delivery_days").default(7),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).pick({
  name: true,
  companyName: true,
  email: true,
  phone: true,
  address: true,
  website: true,
  apiEndpoint: true,
  apiKey: true,
  supportedBrands: true,
  integrationMethod: true,
  paymentTerms: true,
  deliveryInfo: true,
  contactPerson: true,
  isActive: true,
  priority: true,
  averageDeliveryDays: true,
  notes: true,
}).extend({
  name: z.string().min(2, "Naziv mora imati najmanje 2 karaktera").max(100),
  companyName: z.string().min(2, "Naziv kompanije mora imati najmanje 2 karaktera").max(200),
  email: z.string().email("Neispravna email adresa"),
  phone: z.string().max(50).optional(),
  website: z.string().url("Neispravna URL adresa").optional(),
  integrationMethod: z.enum(["email", "api", "fax", "manual"]).default("email"),
  priority: z.number().int().min(1).max(10).default(5),
  averageDeliveryDays: z.number().int().min(1).max(365).default(7),
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// Tabela za automatsko slanje porudžbina dobavljačima
export const supplierOrders = pgTable("supplier_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  sparePartOrderId: integer("spare_part_order_id").notNull(),
  orderNumber: text("order_number"),
  status: text("status", {
    enum: ["pending", "separated", "sent", "delivered", "cancelled"]
  }).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  trackingNumber: text("tracking_number"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  emailContent: text("email_content"),
  supplierResponse: text("supplier_response"),
  autoRetryCount: integer("auto_retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupplierOrderSchema = createInsertSchema(supplierOrders).pick({
  supplierId: true,
  sparePartOrderId: true,
  orderNumber: true,
  status: true,
  trackingNumber: true,
  totalCost: true,
  currency: true,
  estimatedDelivery: true,
  emailContent: true,
  supplierResponse: true,
}).extend({
  supplierId: z.number().int().positive("ID dobavljača mora biti pozitivan broj"),
  sparePartOrderId: z.number().int().positive("ID porudžbine mora biti pozitivan broj"),
  status: z.enum(["pending", "separated", "sent", "delivered", "cancelled"]).default("pending"),
  currency: z.string().default("EUR"),
});

export type InsertSupplierOrder = z.infer<typeof insertSupplierOrderSchema>;
export type SupplierOrder = typeof supplierOrders.$inferSelect;
