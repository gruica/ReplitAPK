import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Service Routes
 * - Services CRUD
 * - Service assignment
 * - Service completion
 * - Service status updates
 */
export function registerServiceRoutes(app: Express) {
  // Service endpoints will be moved here
  console.log("✅ Service routes registered");
}
