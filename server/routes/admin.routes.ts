import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Admin Routes
 * - User management
 * - Permissions
 * - Audit logs
 * - Deleted services
 * - Security endpoints
 */
export function registerAdminRoutes(app: Express) {
  // Admin endpoints will be moved here
  console.log("✅ Admin routes registered");
}
