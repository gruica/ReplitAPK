import { pgTable, serial, integer, text, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { manufacturers } from './appliances.schema';

// ============================================================================
// PARTS CATALOG INTERNAL - Interni katalog rezervnih delova
// ============================================================================

export const partsCatalog = pgTable("parts_catalog", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  partName: text("part_name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  manufacturerId: integer("manufacturer_id").notNull().references(() => manufacturers.id),
  compatibleModels: text("compatible_models"),
  priceEur: decimal("price_eur", { precision: 10, scale: 2 }),
  priceGbp: decimal("price_gbp", { precision: 10, scale: 2 }),
  supplierName: text("supplier_name"),
  supplierUrl: text("supplier_url"),
  imageUrls: text("image_urls"),
  availability: text("availability", { enum: ["available", "out_of_stock", "discontinued", "on_order"] }).default("available").notNull(),
  stockLevel: integer("stock_level").default(0).notNull(),
  minStockLevel: integer("min_stock_level").default(0).notNull(),
  dimensions: text("dimensions"),
  weight: text("weight"),
  technicalSpecs: text("technical_specs"),
  installationNotes: text("installation_notes"),
  warrantyPeriod: text("warranty_period"),
  isOemPart: boolean("is_oem_part").default(true).notNull(),
  alternativePartNumbers: text("alternative_part_numbers"),
  sourceType: text("source_type", { enum: ["manual", "import", "api", "scraping"] }).default("manual").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartsCatalogSchema = createInsertSchema(partsCatalog).pick({
  partNumber: true,
  partName: true,
  description: true,
  category: true,
  manufacturerId: true,
  compatibleModels: true,
  priceEur: true,
  priceGbp: true,
  supplierName: true,
  supplierUrl: true,
  imageUrls: true,
  availability: true,
  stockLevel: true,
  minStockLevel: true,
  dimensions: true,
  weight: true,
  technicalSpecs: true,
  installationNotes: true,
  warrantyPeriod: true,
  isOemPart: true,
  alternativePartNumbers: true,
  sourceType: true,
  isActive: true,
});

export type InsertPartsCatalog = z.infer<typeof insertPartsCatalogSchema>;
export type PartsCatalog = typeof partsCatalog.$inferSelect;

export const partsCatalogRelations = relations(partsCatalog, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [partsCatalog.manufacturerId],
    references: [manufacturers.id],
  }),
}));
