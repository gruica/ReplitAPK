import NodeCache from "node-cache";
import { performance } from "perf_hooks";

// Performance Optimization System
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private cache: NodeCache;
  private queryMetrics: Map<string, { totalTime: number; count: number; avgTime: number }> = new Map();
  private memoryMonitor: { peak: number; current: number; threshold: number } = {
    peak: 0,
    current: 0,
    threshold: 512 * 1024 * 1024 // 512MB threshold
  };

  private constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false, // Better performance
      maxKeys: 10000 // Prevent memory overflow
    });

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Caching System
  public set(key: string, value: any, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 300);
  }

  public get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  public del(key: string): number {
    return this.cache.del(key);
  }

  public flush(): void {
    this.cache.flushAll();
  }

  // Cache with function wrapper
  public async cacheOrExecute<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttl: number = 300
  ): Promise<T> {
    let cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }

  // Database Query Optimization
  public async optimizeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Track query metrics
      this.trackQueryMetrics(queryName, executionTime);

      // Log slow queries
      if (executionTime > 1000) { // Slower than 1 second
        console.warn(`🐌 [SLOW QUERY] ${queryName} took ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      console.error(`❌ [QUERY ERROR] ${queryName} failed after ${executionTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  // Memory Management
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryMonitor.current = usage.heapUsed;
      
      if (usage.heapUsed > this.memoryMonitor.peak) {
        this.memoryMonitor.peak = usage.heapUsed;
      }

      // Clear cache if memory usage is too high
      if (usage.heapUsed > this.memoryMonitor.threshold) {
        console.warn(`⚠️ [MEMORY WARNING] High memory usage: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        this.clearOldCacheEntries();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private clearOldCacheEntries(): void {
    const keys = this.cache.keys();
    const now = Date.now();
    
    // Remove 25% of cache entries to free memory
    const toRemove = Math.floor(keys.length * 0.25);
    for (let i = 0; i < toRemove && i < keys.length; i++) {
      this.cache.del(keys[i]);
    }
    
    console.log(`🧹 [CACHE CLEANUP] Removed ${toRemove} cache entries`);
  }

  // Query Metrics Tracking
  private trackQueryMetrics(queryName: string, executionTime: number): void {
    const existing = this.queryMetrics.get(queryName);
    
    if (existing) {
      existing.totalTime += executionTime;
      existing.count += 1;
      existing.avgTime = existing.totalTime / existing.count;
    } else {
      this.queryMetrics.set(queryName, {
        totalTime: executionTime,
        count: 1,
        avgTime: executionTime
      });
    }
  }

  // Performance Analytics
  public getPerformanceReport(): {
    cache: {
      hitRate: number;
      keys: number;
      memoryUsage: string;
    };
    memory: {
      current: string;
      peak: string;
      threshold: string;
    };
    queries: Array<{
      name: string;
      avgTime: number;
      count: number;
      totalTime: number;
    }>;
    recommendations: string[];
  } {
    const cacheStats = this.cache.getStats();
    const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0;
    
    const queriesArray = Array.from(this.queryMetrics.entries()).map(([name, metrics]) => ({
      name,
      avgTime: Math.round(metrics.avgTime * 100) / 100,
      count: metrics.count,
      totalTime: Math.round(metrics.totalTime * 100) / 100
    })).sort((a, b) => b.avgTime - a.avgTime);

    const recommendations = [];
    
    if (hitRate < 0.8) {
      recommendations.push('Increase cache TTL for frequently accessed data');
    }
    
    if (queriesArray.some(q => q.avgTime > 500)) {
      recommendations.push('Optimize slow database queries');
    }
    
    if (this.memoryMonitor.current > this.memoryMonitor.threshold * 0.8) {
      recommendations.push('Consider increasing server memory or optimizing memory usage');
    }

    return {
      cache: {
        hitRate: Math.round(hitRate * 100),
        keys: this.cache.keys().length,
        memoryUsage: `${(cacheStats.ksize || 0 / 1024).toFixed(2)}KB`
      },
      memory: {
        current: `${(this.memoryMonitor.current / 1024 / 1024).toFixed(2)}MB`,
        peak: `${(this.memoryMonitor.peak / 1024 / 1024).toFixed(2)}MB`,
        threshold: `${(this.memoryMonitor.threshold / 1024 / 1024).toFixed(2)}MB`
      },
      queries: queriesArray.slice(0, 10), // Top 10 slowest queries
      recommendations
    };
  }

  // Response Time Optimizer
  public responseTimeMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Add response time header
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        
        // Log slow responses
        if (responseTime > 2000) { // Slower than 2 seconds
          console.warn(`🐌 [SLOW RESPONSE] ${req.method} ${req.path} took ${responseTime.toFixed(2)}ms`);
        }
      });
      
      next();
    };
  }

  // Database Connection Pool Optimizer
  public optimizeConnectionPool(pool: any): void {
    // Monitor connection pool health
    setInterval(() => {
      if (pool.totalCount && pool.idleCount && pool.waitingCount) {
        const totalConnections = pool.totalCount;
        const idleConnections = pool.idleCount;
        const waitingConnections = pool.waitingCount;
        
        if (waitingConnections > 5) {
          console.warn(`⚠️ [DB POOL] High waiting connections: ${waitingConnections}`);
        }
        
        if (idleConnections < 2 && totalConnections > 5) {
          console.warn(`⚠️ [DB POOL] Low idle connections: ${idleConnections}/${totalConnections}`);
        }
      }
    }, 60000); // Check every minute
  }

  // Auto-scaling Cache TTL based on access patterns
  public smartCacheTTL(key: string, baseAccessCount: number = 0): number {
    const accessPattern = this.cache.getTtl(key);
    
    // Increase TTL for frequently accessed items
    if (baseAccessCount > 100) return 1800; // 30 minutes
    if (baseAccessCount > 50) return 900;   // 15 minutes
    if (baseAccessCount > 20) return 600;   // 10 minutes
    
    return 300; // 5 minutes default
  }

  // Batch Operations Optimizer
  public async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 50
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Small delay to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Utility functions for common optimizations
export function createOptimizedApiHandler<T>(
  cacheKey: string,
  cacheTTL: number,
  handler: () => Promise<T>
) {
  return async (): Promise<T> => {
    return performanceOptimizer.cacheOrExecute(cacheKey, handler, cacheTTL);
  };
}

export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    return performanceOptimizer.optimizeQuery(name, () => fn(...args));
  };
}