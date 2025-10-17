import { db } from "../db.js";
import { 
  clients,
  Client,
  InsertClient
} from "../../shared/schema/index.js";
import { eq, desc } from "drizzle-orm";

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
    const [clients] = await db
      .select()
      .from(clients)
      .where(eq(clients.partnerId, partnerId));
    return clients || [];
  }
}

export const clientStorage = new ClientStorage();
