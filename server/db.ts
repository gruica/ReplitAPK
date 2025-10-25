import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Force schema reload - imported version ensures fresh module
import { USERS_SCHEMA_VERSION } from "@shared/schema/users.schema";
console.log(`📋 [SCHEMA] Users schema version: ${USERS_SCHEMA_VERSION}`);

neonConfig.webSocketConstructor = ws;

// ============================================================================
// SMART DATABASE SELECTION - Production vs Development
// ============================================================================
// PRODUCTION (deployed): Uses DATABASE_URL (pravi klijenti, pravi podaci)
// DEVELOPMENT (local): Uses DEV_DATABASE_URL (test podaci, sigurno testiranje)
// ============================================================================

const isProduction = process.env.REPLIT_DEPLOYMENT === 'true' || process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

let databaseUrl: string | undefined;
let databaseName: string;

if (isProduction) {
  // PRODUCTION: Koristi glavnu production bazu
  databaseUrl = process.env.DATABASE_URL;
  databaseName = 'PRODUCTION (neondb)';
} else {
  // DEVELOPMENT: Koristi development test bazu
  databaseUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  databaseName = process.env.DEV_DATABASE_URL ? 'DEVELOPMENT (development_db)' : 'PRODUCTION (fallback)';
}

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`🔗 [DATABASE]: Connected to ${databaseName}`);
console.log(`🌍 [ENVIRONMENT]: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// ENTERPRISE-GRADE CONNECTION POOLING FOR 100% PERFORMANCE
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 25, // povećan broj konekcija za enterprise load
  min: 2, // održava minimalne konekcije
  idleTimeoutMillis: 60000, // produžen idle timeout 
  connectionTimeoutMillis: 3000, // optimizovan connection timeout
  maxUses: 10000, // povećan broj korištenja konekcije
  allowExitOnIdle: false, 
  keepAlive: true,
  keepAliveInitialDelayMillis: 0, // instant keepalive
  statement_timeout: 30000, // 30s query timeout
  query_timeout: 30000, // 30s query timeout
  application_name: 'FrigoSistemAdmin_v2025' // identifikacija aplikacije
});

// Event handleri za pool s poboljšanim logovanjem i rukovanjem greškama
pool.on('connect', () => {
  console.log('Baza: Nova konekcija uspostavljena');
});

pool.on('error', (err: any) => {
  console.error('Baza: Greška u pool-u:', err);
  
  // Dodatni detalji za dijagnostiku
  if (err.code === '57P01') {
    console.error('Baza: Došlo je do prekida konekcije. Ponovno ću se povezati.');
  } else if (err.code === '08006' || err.code === '08001' || err.code === '08004') {
    console.error('Baza: Greška konekcije. Provjerite mrežnu vezu i postavke baze.');
  } else if (err.code === 'XX000' && err.message?.includes('disabled')) {
    console.warn('⏰ [NEON] Baza je u suspend modu - auto-wake će je probuditi na sljedeći query');
  }
  
  // Prevent the error from causing uncaught exceptions
  // This is particularly important for Neon serverless connection issues
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: process.env.NODE_ENV === 'development' // production-ready logging
});

// AUTO-WAKE NEON DATABASE IF SUSPENDED
export async function wakeNeonDatabase(maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 [NEON] Pokušaj buđenja baze (#${i + 1}/${maxRetries})...`);
      await pool.query('SELECT 1');
      console.log(`✅ [NEON] Baza je aktivna!`);
      return true;
    } catch (err: any) {
      if (err.code === 'XX000' && err.message?.includes('disabled')) {
        console.log(`⏰ [NEON] Baza spava, čekam 2s prije sljedećeg pokušaja...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      console.error(`❌ [NEON] Wake greška:`, err.message);
      return false;
    }
  }
  console.error(`❌ [NEON] Baza se nije probudila nakon ${maxRetries} pokušaja`);
  return false;
}

// ENTERPRISE HEALTH CHECK & MONITORING
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; responseTime: number; activeConnections: number }> {
  const startTime = Date.now();
  try {
    await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    const poolStats = pool.totalCount;
    
    return {
      healthy: true,
      responseTime,
      activeConnections: poolStats
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      activeConnections: 0
    };
  }
}
