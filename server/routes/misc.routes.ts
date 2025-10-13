import type { Express } from "express";
import { storage } from "../storage";

/**
 * Miscellaneous Routes
 * - Health checks
 * - Search
 * - Downloads (APK)
 * - QR codes
 * - Stats
 */
export function registerMiscRoutes(app: Express) {
  // Misc endpoints will be moved here
  console.log("✅ Misc routes registered");
}
