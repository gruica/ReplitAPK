import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Appliance Routes
 * - Appliances CRUD
 * - Categories CRUD
 * - Manufacturers CRUD
 */
export function registerApplianceRoutes(app: Express) {
  // Appliance endpoints will be moved here
  console.log("✅ Appliance routes registered");
}
