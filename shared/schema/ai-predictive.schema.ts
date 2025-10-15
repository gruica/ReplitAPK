import { pgTable, serial, integer, text, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { applianceCategories, manufacturers, appliances } from './appliances.schema';
import { clients } from './clients.schema';

// ============================================================================
// AI PREDICTIVE MAINTENANCE - Prediktivno održavanje
// ============================================================================

export const maintenancePatterns = pgTable("maintenance_patterns", {
  id: serial("id").primaryKey(),
  applianceCategoryId: integer("appliance_category_id").notNull(),
  manufacturerId: integer("manufacturer_id"),
  averageServiceInterval: integer("average_service_interval"),
  commonFailurePoints: text("common_failure_points").array(),
  seasonalFactors: text("seasonal_factors"),
  usagePatterns: text("usage_patterns"),
  analysisData: text("analysis_data"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  lastAnalysis: timestamp("last_analysis").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaintenancePatternsSchema = createInsertSchema(maintenancePatterns).pick({
  applianceCategoryId: true,
  manufacturerId: true,
  averageServiceInterval: true,
  commonFailurePoints: true,
  seasonalFactors: true,
  usagePatterns: true,
  analysisData: true,
  confidenceScore: true,
});

export type InsertMaintenancePatterns = z.infer<typeof insertMaintenancePatternsSchema>;
export type MaintenancePatterns = typeof maintenancePatterns.$inferSelect;

export const predictiveInsights = pgTable("predictive_insights", {
  id: serial("id").primaryKey(),
  applianceId: integer("appliance_id").notNull(),
  clientId: integer("client_id").notNull(),
  predictedMaintenanceDate: timestamp("predicted_maintenance_date"),
  riskLevel: text("risk_level"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  predictedFailures: text("predicted_failures").array(),
  recommendedActions: text("recommended_actions").array(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),
  factors: text("factors"),
  lastServiceDate: timestamp("last_service_date"),
  nextReviewDate: timestamp("next_review_date"),
  isActive: boolean("is_active").default(true).notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPredictiveInsightsSchema = createInsertSchema(predictiveInsights).pick({
  applianceId: true,
  clientId: true,
  predictedMaintenanceDate: true,
  riskLevel: true,
  riskScore: true,
  predictedFailures: true,
  recommendedActions: true,
  estimatedCost: true,
  confidenceLevel: true,
  factors: true,
  lastServiceDate: true,
  nextReviewDate: true,
  isActive: true,
});

export type InsertPredictiveInsights = z.infer<typeof insertPredictiveInsightsSchema>;
export type PredictiveInsights = typeof predictiveInsights.$inferSelect;

export const aiAnalysisResults = pgTable("ai_analysis_results", {
  id: serial("id").primaryKey(),
  analysisType: text("analysis_type").notNull(),
  applianceId: integer("appliance_id"),
  clientId: integer("client_id"),
  analysisInput: text("analysis_input"),
  analysisOutput: text("analysis_output"),
  insights: text("insights").array(),
  recommendations: text("recommendations").array(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  processingTime: integer("processing_time"),
  dataPoints: integer("data_points"),
  modelVersion: text("model_version"),
  isSuccessful: boolean("is_successful").default(true).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiAnalysisResultsSchema = createInsertSchema(aiAnalysisResults).pick({
  analysisType: true,
  applianceId: true,
  clientId: true,
  analysisInput: true,
  analysisOutput: true,
  insights: true,
  recommendations: true,
  accuracy: true,
  processingTime: true,
  dataPoints: true,
  modelVersion: true,
  isSuccessful: true,
  errorMessage: true,
});

export type InsertAiAnalysisResults = z.infer<typeof insertAiAnalysisResultsSchema>;
export type AiAnalysisResults = typeof aiAnalysisResults.$inferSelect;

// Relations
export const maintenancePatternsRelations = relations(maintenancePatterns, ({ one }) => ({
  applianceCategory: one(applianceCategories, {
    fields: [maintenancePatterns.applianceCategoryId],
    references: [applianceCategories.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [maintenancePatterns.manufacturerId],
    references: [manufacturers.id],
  }),
}));

export const predictiveInsightsRelations = relations(predictiveInsights, ({ one }) => ({
  appliance: one(appliances, {
    fields: [predictiveInsights.applianceId],
    references: [appliances.id],
  }),
  client: one(clients, {
    fields: [predictiveInsights.clientId],
    references: [clients.id],
  }),
}));

export const aiAnalysisResultsRelations = relations(aiAnalysisResults, ({ one }) => ({
  appliance: one(appliances, {
    fields: [aiAnalysisResults.applianceId],
    references: [appliances.id],
  }),
  client: one(clients, {
    fields: [aiAnalysisResults.clientId],
    references: [clients.id],
  }),
}));
