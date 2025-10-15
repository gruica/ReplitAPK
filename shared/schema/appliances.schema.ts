import { pgTable, text, serial, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Appliance categories
export const applianceCategories = pgTable("appliance_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Material icon name
});

export const insertApplianceCategorySchema = createInsertSchema(applianceCategories)
  .pick({
    name: true,
    icon: true,
  })
  .extend({
    // Validacija imena kategorije
    name: z.string()
      .min(2, "Naziv kategorije mora imati najmanje 2 karaktera")
      .max(100, "Naziv kategorije ne sme biti duži od 100 karaktera")
      .trim(), // Uklanja razmake na početku i kraju
    
    // Validacija ikone
    icon: z.string()
      .min(1, "Ikona je obavezna")
      .max(50, "Naziv ikone je predugačak")
      .trim(), // Uklanja razmake na početku i kraju
  });

export type InsertApplianceCategory = z.infer<typeof insertApplianceCategorySchema>;
export type ApplianceCategory = typeof applianceCategories.$inferSelect;

// Manufacturers
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertManufacturerSchema = createInsertSchema(manufacturers)
  .pick({
    name: true,
  })
  .extend({
    // Validacija da ime proizvođača mora biti između 2 i 100 karaktera
    name: z.string()
      .min(2, "Naziv proizvođača mora imati najmanje 2 karaktera")
      .max(100, "Naziv proizvođača ne sme biti duži od 100 karaktera")
      .trim(), // Uklanja razmake na početku i kraju
  });

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

// Appliances
export const appliances = pgTable("appliances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  categoryId: integer("category_id").notNull(),
  manufacturerId: integer("manufacturer_id").notNull(),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"),
  notes: text("notes"),
}, (table) => ({
  // Indeksi za brze pretrage po klijentu i kategoriji
  clientIdIdx: index("appliances_client_id_idx").on(table.clientId),
  categoryIdIdx: index("appliances_category_id_idx").on(table.categoryId),
}));

// Poboljšana šema za validaciju uređaja
export const insertApplianceSchema = createInsertSchema(appliances).pick({
  clientId: true,
  categoryId: true,
  manufacturerId: true,
  model: true,
  serialNumber: true,
  purchaseDate: true,
  notes: true,
}).extend({
  clientId: z.number().int().positive("ID klijenta mora biti pozitivan broj"),
  categoryId: z.number().int().positive("ID kategorije mora biti pozitivan broj"),
  manufacturerId: z.number().int().positive("ID proizvođača mora biti pozitivan broj"),
  model: z.string().min(1, "Model je obavezan").max(100, "Model je predugačak").or(z.literal("")).optional(),
  serialNumber: z.string().max(50, "Serijski broj je predugačak").or(z.literal("")).optional(),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, "Datum kupovine ne može biti u budućnosti"),
  notes: z.string().max(500, "Napomene su predugačke").or(z.literal("")).optional(),
});

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;
