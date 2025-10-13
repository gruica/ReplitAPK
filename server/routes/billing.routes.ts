import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Billing Routes
 * - Beko billing reports
 * - ComPlus billing reports
 * - In-warranty & out-of-warranty
 */
export function registerBillingRoutes(app: Express) {
  // Billing endpoints will be moved here
  console.log("✅ Billing routes registered");
}
