import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { services } from "./services.schema";
import { users } from "./users.schema";

// Tabela za praćenje uklonjenih delova sa uređaja
export const removedParts = pgTable("removed_parts", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  partName: text("part_name").notNull(),
  partDescription: text("part_description"),
  removalDate: text("removal_date").notNull(),
  removalReason: text("removal_reason").notNull(),
  currentLocation: text("current_location").default("workshop"),
  expectedReturnDate: text("expected_return_date"),
  actualReturnDate: text("actual_return_date"),
  partStatus: text("part_status").notNull().default("removed"),
  technicianNotes: text("technician_notes"),
  repairCost: text("repair_cost"),
  isReinstalled: boolean("is_reinstalled").default(false),
  createdBy: integer("created_by").notNull(),
});

export const insertRemovedPartSchema = createInsertSchema(removedParts).pick({
  serviceId: true,
  partName: true,
  partDescription: true,
  removalDate: true,
  removalReason: true,
  currentLocation: true,
  expectedReturnDate: true,
  actualReturnDate: true,
  partStatus: true,
  technicianNotes: true,
  repairCost: true,
  isReinstalled: true,
  createdBy: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  partName: z.string().min(2, "Naziv dela mora imati najmanje 2 karaktera").max(100, "Naziv dela je predugačak"),
  partDescription: z.string().max(500, "Opis dela je predugačak").optional(),
  removalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD"),
  removalReason: z.string().min(5, "Razlog uklanjanja mora biti detaljniji").max(300, "Razlog je predugačak"),
  currentLocation: z.enum(["workshop", "external_repair", "returned"]).default("workshop"),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD").optional(),
  actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD").optional(),
  partStatus: z.enum(["removed", "in_repair", "repaired", "returned", "replaced"]).default("removed"),
  technicianNotes: z.string().max(500, "Napomene su predugačke").optional(),
  repairCost: z.string().max(20, "Cena je predugačka").optional(),
  isReinstalled: z.boolean().default(false),
  createdBy: z.number().int().positive("ID servisera mora biti pozitivan broj"),
});

export type InsertRemovedPart = z.infer<typeof insertRemovedPartSchema>;
export type RemovedPart = typeof removedParts.$inferSelect;

// Service Photos
export const servicePhotos = pgTable("service_photos", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  photoPath: text("photo_path").notNull(),
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isBeforeRepair: boolean("is_before_repair").default(true),
  category: text("category").default("general"),
});

export const insertServicePhotoSchema = createInsertSchema(servicePhotos).pick({
  serviceId: true,
  photoPath: true,
  description: true,
  uploadedBy: true,
  isBeforeRepair: true,
  category: true,
}).extend({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  photoPath: z.string().min(1, "Putanja fotografije je obavezna"),
  description: z.string().max(500, "Opis ne može biti duži od 500 karaktera").optional(),
  uploadedBy: z.number().int().positive("ID korisnika mora biti pozitivan broj"),
  isBeforeRepair: z.boolean().default(true),
  category: z.enum(["before", "after", "parts", "damage", "documentation", "other"]).default("other"),
});

export type InsertServicePhoto = z.infer<typeof insertServicePhotoSchema>;
export type ServicePhoto = typeof servicePhotos.$inferSelect;

// Service Completion Reports
export const serviceCompletionReports = pgTable('service_completion_reports', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull(),
  technicianId: integer('technician_id').notNull(),
  workDescription: text('work_description').notNull(),
  problemDiagnosis: text('problem_diagnosis').notNull(),
  solutionDescription: text('solution_description').notNull(),
  warrantyStatus: text('warranty_status').notNull(),
  warrantyPeriod: text('warranty_period'),
  usedSpareParts: text('used_spare_parts').default('[]'),
  laborTime: integer('labor_time'),
  totalCost: text('total_cost'),
  clientSatisfaction: integer('client_satisfaction'),
  additionalNotes: text('additional_notes'),
  techniciansSignature: text('technicians_signature'),
  photosBeforeWork: text('photos_before_work').default('[]'),
  photosAfterWork: text('photos_after_work').default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const insertServiceCompletionReportSchema = z.object({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj"),
  workDescription: z.string().min(10, "Opis rada mora biti detaljniji (min 10 karaktera)").max(1000, "Opis rada je predugačak"),
  problemDiagnosis: z.string().min(10, "Dijagnoza mora biti detaljnija (min 10 karaktera)").max(500, "Dijagnoza je predugačka"),
  solutionDescription: z.string().min(10, "Opis rešenja mora biti detaljniji (min 10 karaktera)").max(500, "Opis rešenja je predugačak"),
  warrantyStatus: z.enum(["u_garanciji", "van_garancije"]),
  warrantyPeriod: z.string().max(50, "Garancijski period je predugačak").optional(),
  usedSpareParts: z.string().default('[]'),
  laborTime: z.number().int().min(1, "Vreme rada mora biti najmanje 1 minut").max(1440, "Vreme rada ne može biti više od 24 sata").optional(),
  totalCost: z.string().max(20, "Cena je predugačka").optional(),
  clientSatisfaction: z.number().int().min(1, "Ocena mora biti između 1 i 5").max(5, "Ocena mora biti između 1 i 5").optional(),
  additionalNotes: z.string().max(1000, "Dodatne napomene su predugačke").optional(),
  techniciansSignature: z.string().max(100, "Potpis je predugačak").optional(),
  photosBeforeWork: z.string().default('[]'),
  photosAfterWork: z.string().default('[]'),
});

export type InsertServiceCompletionReport = z.infer<typeof insertServiceCompletionReportSchema>;
export type ServiceCompletionReport = typeof serviceCompletionReports.$inferSelect;
