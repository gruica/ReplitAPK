import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";

/**
 * Technician Routes
 * - My services
 * - Quick start service
 * - Complete service
 * - Technician stats
 */
export function registerTechnicianRoutes(app: Express) {
  // Technician endpoints will be moved here
  console.log("✅ Technician routes registered");
}
