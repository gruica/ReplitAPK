import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Service status enum
export const serviceStatusEnum = z.enum([
  "pending", // čekanje
  "scheduled", // zakazano
  "in_progress", // u procesu
  "waiting_parts", // čeka delove
  "device_parts_removed", // delovi uklonjeni sa uređaja
  "completed", // završeno
  "delivered", // isporučen aparat klijentu
  "device_returned", // aparat vraćen
  "cancelled", // otkazano
  "client_not_home", // klijent nije kući
  "client_not_answering", // klijent se ne javlja
  "customer_refuses_repair", // kupac odbija popravku
  "customer_refused_repair", // kupac je odbio popravku (zatvoreno)
  "repair_failed", // servis neuspešan - aparat nije popravljen
]);

export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

// Warranty status enum
export const warrantyStatusEnum = z.enum([
  "u garanciji", // u garanciji
  "van garancije", // van garancije
  "nepoznato", // nepoznato - mora se later ažurirati
]);

export type WarrantyStatus = z.infer<typeof warrantyStatusEnum>;

// Warranty status strict enum for new services
export const warrantyStatusStrictEnum = z.enum([
  "u garanciji", // under warranty
  "van garancije", // out of warranty
]);

export type WarrantyStatusStrict = z.infer<typeof warrantyStatusStrictEnum>;

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  applianceId: integer("appliance_id").notNull(),
  technicianId: integer("technician_id"),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  warrantyStatus: text("warranty_status").notNull(), // u garanciji ili van garancije
  createdAt: text("created_at").notNull(),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  technicianNotes: text("technician_notes"),
  cost: text("cost"),
  billingPrice: text("billing_price"),
  billingPriceReason: text("billing_price_reason"),
  excludeFromBilling: boolean("exclude_from_billing").default(false),
  usedParts: text("used_parts"),
  machineNotes: text("machine_notes"),
  isCompletelyFixed: boolean("is_completely_fixed"),
  businessPartnerId: integer("business_partner_id"),
  partnerCompanyName: text("partner_company_name"),
  clientUnavailableReason: text("client_unavailable_reason"),
  needsRescheduling: boolean("needs_rescheduling").default(false),
  reschedulingNotes: text("rescheduling_notes"),
  devicePickedUp: boolean("device_picked_up").default(false),
  pickupDate: text("pickup_date"),
  pickupNotes: text("pickup_notes"),
  customerRefusesRepair: boolean("customer_refuses_repair").default(false),
  customerRefusalReason: text("customer_refusal_reason"),
  repairFailed: boolean("repair_failed").default(false),
  repairFailureReason: text("repair_failure_reason"),
  replacedPartsBeforeFailure: text("replaced_parts_before_failure"),
  repairFailureDate: text("repair_failure_date"),
  isWarrantyService: boolean("is_warranty_service").default(false),
}, (table) => ({
  // Indeksi za najčešće query-je - kritično za performanse!
  statusIdx: index("services_status_idx").on(table.status),
  technicianIdIdx: index("services_technician_id_idx").on(table.technicianId),
  createdAtIdx: index("services_created_at_idx").on(table.createdAt),
  clientIdIdx: index("services_client_id_idx").on(table.clientId),
  warrantyStatusIdx: index("services_warranty_status_idx").on(table.warrantyStatus),
}));

export type Service = typeof services.$inferSelect;

// Extended Service type with JOIN fields
export type ServiceWithDetails = Service & {
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  applianceName?: string | null;
  applianceSerialNumber?: string | null;
  applianceModel?: string | null;
  manufacturerName?: string | null;
  categoryName?: string | null;
  technicianName?: string | null;
  technicianPhone?: string | null;
  businessPartnerName?: string | null;
  businessPartnerCompany?: string | null;
};

// Schema za dopunjavanje Generali servisa
export const supplementGeneraliServiceSchema = z.object({
  serviceId: z.number().int().positive("ID servisa mora biti pozitivan broj"),
  clientEmail: z.union([
    z.string().email("Unesite validnu email adresu"),
    z.literal("")
  ]).optional(),
  clientAddress: z.string().min(5, "Adresa mora imati najmanje 5 karaktera").max(200, "Adresa je predugačka").optional(),
  clientCity: z.string().min(2, "Grad mora imati najmanje 2 karaktera").max(50, "Grad je predugačak").optional(),
  serialNumber: z.string().min(3, "Serijski broj mora imati najmanje 3 karaktera").max(50, "Serijski broj je predugačak").optional(),
  model: z.string().min(2, "Model mora imati najmanje 2 karaktera").max(100, "Model je predugačak").optional(),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, "Datum kupovine ne može biti u budućnosti"),
  supplementNotes: z.string().max(500, "Napomene su predugačke").optional(),
});

export type SupplementGeneraliService = z.infer<typeof supplementGeneraliServiceSchema>;
