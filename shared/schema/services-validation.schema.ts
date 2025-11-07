import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { services, serviceStatusEnum, warrantyStatusStrictEnum } from "./services.schema";

// Osnovni schema za validaciju servisa - samo obavezna polja
export const insertServiceSchema = createInsertSchema(services).pick({
  clientId: true,
  applianceId: true,
  technicianId: true,
  description: true,
  status: true,
  warrantyStatus: true,
  createdAt: true,
  scheduledDate: true,
  completedDate: true,
  technicianNotes: true,
  cost: true,
  billingPrice: true,
  billingPriceReason: true,
  excludeFromBilling: true,
  usedParts: true,
  machineNotes: true,
  isCompletelyFixed: true,
  businessPartnerId: true,
  partnerCompanyName: true,
  clientUnavailableReason: true,
  needsRescheduling: true,
  reschedulingNotes: true,
  devicePickedUp: true,
  pickupDate: true,
  pickupNotes: true,
  customerRefusesRepair: true,
  customerRefusalReason: true,
  repairFailed: true,
  repairFailureReason: true,
  replacedPartsBeforeFailure: true,
  repairFailureDate: true,
  isWarrantyService: true,
}).extend({
  clientId: z.number().int().positive("ID klijenta mora biti pozitivan broj"),
  applianceId: z.number().int().positive("ID uređaja mora biti pozitivan broj"),
  technicianId: z.number().int().positive("ID servisera mora biti pozitivan broj").nullable().optional(),
  description: z.string().min(5, "Opis problema mora biti detaljniji (min. 5 karaktera)").max(1000, "Opis je predugačak"),
  status: serviceStatusEnum.default("pending"),
  warrantyStatus: warrantyStatusStrictEnum,
  createdAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum"),
  scheduledDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum zakazivanja"),
  completedDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum završetka"),
  technicianNotes: z.string().max(1000, "Napomene su predugačke").or(z.literal("")).nullable().optional(),
  cost: z.string().max(50, "Iznos je predugačak").or(z.literal("")).nullable().optional(),
  billingPrice: z.string().max(50, "Cena za naplatu je predugačka").or(z.literal("")).nullable().optional(),
  billingPriceReason: z.string().max(500, "Razlog cene je predugačak").or(z.literal("")).nullable().optional(),
  excludeFromBilling: z.boolean().nullable().optional(),
  usedParts: z.string().max(1000, "Lista delova je predugačka").or(z.literal("")).nullable().optional()
    .refine(val => {
      if (!val || val === "") return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, "Nevažeći JSON format za korišćene delove"),
  machineNotes: z.string().max(500, "Napomene o uređaju su predugačke").or(z.literal("")).nullable().optional(),
  isCompletelyFixed: z.boolean().nullable().optional(),
  businessPartnerId: z.union([
    z.number().int().positive("ID poslovnog partnera mora biti pozitivan broj"),
    z.string().refine((val) => !isNaN(parseInt(val)), {
      message: "ID poslovnog partnera mora biti broj ili string koji se može konvertovati u broj"
    }).transform(val => parseInt(val))
  ]).nullable().optional(),
  partnerCompanyName: z.string().max(100, "Naziv kompanije je predugačak").or(z.literal("")).nullable().optional(),
  clientUnavailableReason: z.string().max(500, "Razlog nedostupnosti je predugačak").or(z.literal("")).nullable().optional(),
  needsRescheduling: z.boolean().nullable().optional(),
  reschedulingNotes: z.string().max(1000, "Napomene za ponovno zakazivanje su predugačke").or(z.literal("")).nullable().optional(),
  devicePickedUp: z.boolean().nullable().optional(),
  pickupDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
    .or(z.literal(""))
    .nullable()
    .optional()
    .refine(val => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Nevažeći datum preuzimanja"),
  pickupNotes: z.string().max(1000, "Napomene o preuzimanju su predugačke").or(z.literal("")).nullable().optional(),
}).partial({
  // Ova polja su opciona za osnovnu formu za kreiranje servisa
  technicianId: true,
  scheduledDate: true,
  completedDate: true,
  technicianNotes: true,
  cost: true,
  billingPrice: true,
  billingPriceReason: true,
  excludeFromBilling: true,
  usedParts: true,
  machineNotes: true,
  isCompletelyFixed: true,
  businessPartnerId: true,
  partnerCompanyName: true,
  clientUnavailableReason: true,
  needsRescheduling: true,
  reschedulingNotes: true,
  devicePickedUp: true,
  pickupDate: true,
  pickupNotes: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
