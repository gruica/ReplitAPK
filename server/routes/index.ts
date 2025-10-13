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
  
  console.log("✅ All modular routes registered successfully");
}
