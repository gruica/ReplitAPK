import type { Express } from "express";
import { registerAuthRoutes } from "./auth.routes";
import { registerClientRoutes } from "./client.routes";
import { registerApplianceRoutes } from "./appliance.routes";
import { registerServiceRoutes } from "./service.routes";
import { registerTechnicianRoutes } from "./technician.routes";
import { registerAdminRoutes } from "./admin.routes";
import { registerBillingRoutes } from "./billing.routes";
import { registerSparePartsRoutes } from "./spare-parts.routes";
import { registerMiscRoutes } from "./misc.routes";
import { registerApiV1Routes } from "./api-v1.routes";
import { registerBusinessPartnerRoutes } from "../business-partner-routes";
import { registerSupplierRoutes } from "./supplier.routes";

/**
 * Main Router - Registers all route modules
 */
export function registerAllRoutes(app: Express) {
  console.log("🚀 Registering modular routes...");
  
  // Register all route modules
  registerAuthRoutes(app);
  registerClientRoutes(app);
  registerApplianceRoutes(app);
  registerServiceRoutes(app);
  registerTechnicianRoutes(app);
  registerAdminRoutes(app);
  registerBillingRoutes(app);
  registerSparePartsRoutes(app);
  registerMiscRoutes(app);
  registerBusinessPartnerRoutes(app);
  registerSupplierRoutes(app);
  
  // Register API v1 versioning (must be after original routes)
  registerApiV1Routes(app);
  
  console.log("✅ All modular routes registered successfully");
}
