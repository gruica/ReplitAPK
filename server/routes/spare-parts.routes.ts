import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Spare Parts Routes
 * - Technician requests
 * - Admin approve/order/receive
 * - Consume spare parts
 */
export function registerSparePartsRoutes(app: Express) {
  // Spare parts endpoints will be moved here
  console.log("✅ Spare Parts routes registered");
}
