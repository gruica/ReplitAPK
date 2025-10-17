import { db } from "../db.js";
import { 
  clients,
  services,
  Client,
  InsertClient
} from "../../shared/schema/index.js";
import { eq, desc, inArray } from "drizzle-orm";

/**
 * Client Storage Module
 * Handles all client-related database operations
 */
class ClientStorage {
  
  // ===== CLIENT CRUD METHODS =====
  
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  
  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getRecentClients(limit: number): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.id)).limit(limit);
  }

  // ===== CLIENT QUERY METHODS =====
  
  async getClientsByPartner(partnerId: number): Promise<Client[]> {
    try {
      // Dobijam ID-jeve klijenata iz servisa ovog partnera
      const partnerServices = await db
        .select({ clientId: services.clientId })
        .from(services)
        .where(eq(services.businessPartnerId, partnerId));
      
      const clientIds = [...new Set(partnerServices.map(s => s.clientId).filter(id => id !== null))];
      
      if (clientIds.length === 0) {
        return [];
      }
      
      // Vraćam klijente povezane sa tim servisima
      const partnersClients = await db
        .select()
        .from(clients)
        .where(inArray(clients.id, clientIds))
        .orderBy(clients.fullName);
      
      return partnersClients;
    } catch (error) {
      console.error('Greška pri dohvatanju klijenata za poslovnog partnera:', error);
      return [];
    }
  }
}

export const clientStorage = new ClientStorage();
