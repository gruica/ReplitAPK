/**
 * AI STORAGE MODULE
 * Modularizovani storage za AI predictive insights i analysis results
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { predictiveInsights, aiAnalysisResults } from "../../shared/schema/index.js";
import { eq, and, or, desc } from "drizzle-orm";
import type { 
  PredictiveInsights,
  InsertPredictiveInsights,
  AiAnalysisResults,
  InsertAiAnalysisResults
} from "../../shared/schema/index.js";

export class AIStorage {
  
  // ===== PREDICTIVE INSIGHTS METHODS =====
  
  async getAllPredictiveInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih prediktivnih uvida:', error);
      return [];
    }
  }

  async getPredictiveInsight(id: number): Promise<PredictiveInsights | undefined> {
    try {
      const [insight] = await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.id, id))
        .limit(1);
      return insight;
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnog uvida:', error);
      return undefined;
    }
  }

  async getPredictiveInsightsByAppliance(applianceId: number): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.applianceId, applianceId))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnih uvida po aparatu:', error);
      return [];
    }
  }

  async getPredictiveInsightsByClient(clientId: number): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.clientId, clientId))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju prediktivnih uvida po klijentu:', error);
      return [];
    }
  }

  async getActivePredictiveInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(eq(predictiveInsights.isActive, true))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih prediktivnih uvida:', error);
      return [];
    }
  }

  async getCriticalRiskInsights(): Promise<PredictiveInsights[]> {
    try {
      return await db.select()
        .from(predictiveInsights)
        .where(and(
          eq(predictiveInsights.isActive, true),
          or(
            eq(predictiveInsights.riskLevel, 'critical'),
            eq(predictiveInsights.riskLevel, 'high')
          )
        ))
        .orderBy(desc(predictiveInsights.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju kritičnih rizičnih uvida:', error);
      return [];
    }
  }

  async createPredictiveInsight(insight: InsertPredictiveInsights): Promise<PredictiveInsights> {
    try {
      const [newInsight] = await db.insert(predictiveInsights)
        .values({
          ...insight,
          createdAt: new Date()
        })
        .returning();
      return newInsight;
    } catch (error) {
      console.error('Greška pri kreiranju prediktivnog uvida:', error);
      throw error;
    }
  }

  async updatePredictiveInsight(id: number, insight: Partial<PredictiveInsights>): Promise<PredictiveInsights | undefined> {
    try {
      const [updatedInsight] = await db.update(predictiveInsights)
        .set(insight)
        .where(eq(predictiveInsights.id, id))
        .returning();
      return updatedInsight;
    } catch (error) {
      console.error('Greška pri ažuriranju prediktivnog uvida:', error);
      return undefined;
    }
  }

  async deletePredictiveInsight(id: number): Promise<boolean> {
    try {
      await db.delete(predictiveInsights)
        .where(eq(predictiveInsights.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju prediktivnog uvida:', error);
      return false;
    }
  }

  // ===== AI ANALYSIS RESULTS METHODS =====
  
  async getAllAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih AI analiza:', error);
      return [];
    }
  }

  async getAiAnalysisResult(id: number): Promise<AiAnalysisResults | undefined> {
    try {
      const [result] = await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.id, id))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Greška pri dohvatanju AI analize:', error);
      return undefined;
    }
  }

  async getAiAnalysisResultsByAppliance(applianceId: number): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.applianceId, applianceId))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju AI analiza po aparatu:', error);
      return [];
    }
  }

  async getAiAnalysisResultsByType(analysisType: string): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.analysisType, analysisType))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju AI analiza po tipu:', error);
      return [];
    }
  }

  async getSuccessfulAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    try {
      return await db.select()
        .from(aiAnalysisResults)
        .where(eq(aiAnalysisResults.isSuccessful, true))
        .orderBy(desc(aiAnalysisResults.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju uspešnih AI analiza:', error);
      return [];
    }
  }

  async createAiAnalysisResult(result: InsertAiAnalysisResults): Promise<AiAnalysisResults> {
    try {
      const [newResult] = await db.insert(aiAnalysisResults)
        .values({
          ...result,
          createdAt: new Date()
        })
        .returning();
      return newResult;
    } catch (error) {
      console.error('Greška pri kreiranju AI analize:', error);
      throw error;
    }
  }

  async updateAiAnalysisResult(id: number, result: Partial<AiAnalysisResults>): Promise<AiAnalysisResults | undefined> {
    try {
      const [updatedResult] = await db.update(aiAnalysisResults)
        .set(result)
        .where(eq(aiAnalysisResults.id, id))
        .returning();
      return updatedResult;
    } catch (error) {
      console.error('Greška pri ažuriranju AI analize:', error);
      return undefined;
    }
  }

  async deleteAiAnalysisResult(id: number): Promise<boolean> {
    try {
      await db.delete(aiAnalysisResults)
        .where(eq(aiAnalysisResults.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju AI analize:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiStorage = new AIStorage();
