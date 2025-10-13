import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Client Routes
 * - GET/POST/PUT/DELETE clients
 * - Client details & analytics
 * - Client services
 */
export function registerClientRoutes(app: Express) {
  // Client endpoints will be moved here
  console.log("✅ Client routes registered");
}
