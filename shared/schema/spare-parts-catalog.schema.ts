import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Category enum za spare parts catalog
export const sparePartCategoryEnum = z.enum([
  "washing-machine",
  "dishwasher",
  "oven",
  "cooker-hood",
  "tumble-dryer",
  "fridge-freezer",
  "microwave",
  "universal",
]);

// Availability enum
export const sparePartAvailabilityEnum = z.enum([
  "available",
  "out_of_stock",
  "discontinued",
  "special_order",
]);

// Source type enum
export const sparePartSourceTypeEnum = z.enum([
  "manual",
  "partkeepr_import",
  "web_scraping",
  "supplier_api",
]);

export type SparePartCategory = z.infer<typeof sparePartCategoryEnum>;
export type SparePartAvailability = z.infer<typeof sparePartAvailabilityEnum>;
export type SparePartSourceType = z.infer<typeof sparePartSourceTypeEnum>;

// PartKeepr-compatible spare parts catalog table
export const sparePartsCatalog = pgTable("spare_parts_catalog", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  partName: text("part_name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  manufacturer: text("manufacturer").notNull().default("Candy"),
  compatibleModels: text("compatible_models").array(),
  priceEur: text("price_eur"),
  priceGbp: text("price_gbp"),
  supplierName: text("supplier_name"),
  supplierUrl: text("supplier_url"),
  imageUrls: text("image_urls").array(),
  availability: text("availability").default("available"),
  stockLevel: integer("stock_level").default(0),
  minStockLevel: integer("min_stock_level").default(0),
  dimensions: text("dimensions"),
  weight: text("weight"),
  technicalSpecs: text("technical_specs"),
  installationNotes: text("installation_notes"),
  warrantyPeriod: text("warranty_period"),
  isOemPart: boolean("is_oem_part").default(true),
  alternativePartNumbers: text("alternative_part_numbers").array(),
  sourceType: text("source_type").default("manual"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export type SparePartsCatalog = typeof sparePartsCatalog.$inferSelect;

// Web scraping sources table
export const webScrapingSources = pgTable("web_scraping_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastScrapeDate: timestamp("last_scrape_date"),
  totalPartsScraped: integer("total_parts_scraped").default(0),
  successfulScrapes: integer("successful_scrapes").default(0),
  failedScrapes: integer("failed_scrapes").default(0),
  averageResponseTime: integer("average_response_time").default(0),
  scrapingConfig: text("scraping_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Web scraping logs table
export const webScrapingLogs = pgTable("web_scraping_logs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  status: text("status").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalPages: integer("total_pages").default(0),
  processedPages: integer("processed_pages").default(0),
  newParts: integer("new_parts").default(0),
  updatedParts: integer("updated_parts").default(0),
  errors: text("errors"),
  duration: integer("duration").default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Web scraping queue table
export const webScrapingQueue = pgTable("web_scraping_queue", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  priority: integer("priority").default(1),
  status: text("status").default("pending"),
  scheduledTime: timestamp("scheduled_time").defaultNow().notNull(),
  maxPages: integer("max_pages").default(100),
  targetCategories: text("target_categories").array(),
  targetManufacturers: text("target_manufacturers").array(),
  createdBy: integer("created_by"),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSparePartsCatalogSchema = createInsertSchema(sparePartsCatalog).pick({
  partNumber: true,
  partName: true,
  description: true,
  category: true,
  manufacturer: true,
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
  createdBy: true,
});

export type InsertSparePartsCatalog = z.infer<typeof insertSparePartsCatalogSchema>;
