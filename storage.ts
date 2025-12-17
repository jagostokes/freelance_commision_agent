import { type Session, type PaintingBrief, type Approval, type User, type CallLog, type InsertUser, type InsertCallLog, users, callLogs, authSessions } from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getSession(id: string): Promise<Session | undefined>;
  createSession(id: string): Promise<Session>;
  saveSession(session: Session): Promise<void>;
  updateBrief(sessionId: string, updates: Partial<PaintingBrief>): Promise<Session | undefined>;
  addApproval(sessionId: string, approval: Approval): Promise<Session | undefined>;
  
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAuthSession(userId: number): Promise<string>;
  getAuthSession(token: string): Promise<{ userId: number } | undefined>;
  deleteAuthSession(token: string): Promise<void>;
  
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  getCallLogs(): Promise<CallLog[]>;
  getCallLogsByUserId(userId: number): Promise<CallLog[]>;
  
  seedDemoData(): Promise<void>;
}

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export class DbStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(id: string): Promise<Session> {
    const session: Session = {
      id,
      createdAt: Date.now(),
      messages: [],
      brief: {
        style: null,
        palette: null,
        finish: null,
        vibe: [],
        rooms: [],
        constraints: {},
        timeline: null,
        budget: null,
        openQuestions: [],
      },
      todos: [],
      approvals: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async updateBrief(sessionId: string, updates: Partial<PaintingBrief>): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    session.brief = { ...session.brief, ...updates };
    this.sessions.set(sessionId, session);
    return session;
  }

  async addApproval(sessionId: string, approval: Approval): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    session.approvals.push(approval);
    this.sessions.set(sessionId, session);
    return session;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      accountType: userData.accountType || "personal",
    }).returning();
    return result[0];
  }

  async createAuthSession(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await db.insert(authSessions).values({ token, userId });
    return token;
  }

  async getAuthSession(token: string): Promise<{ userId: number } | undefined> {
    const result = await db.select().from(authSessions).where(eq(authSessions.token, token)).limit(1);
    if (result[0]) {
      return { userId: result[0].userId };
    }
    return undefined;
  }

  async deleteAuthSession(token: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  async createCallLog(logData: InsertCallLog): Promise<CallLog> {
    const result = await db.insert(callLogs).values({
      userId: logData.userId || null,
      userEmail: logData.userEmail || null,
      title: logData.title,
      summary: logData.summary || null,
      style: logData.style || null,
      palette: logData.palette || null,
      finish: logData.finish || null,
    }).returning();
    return result[0];
  }

  async getCallLogs(): Promise<CallLog[]> {
    return db.select().from(callLogs).orderBy(desc(callLogs.createdAt));
  }

  async getCallLogsByUserId(userId: number): Promise<CallLog[]> {
    return db.select().from(callLogs).where(eq(callLogs.userId, userId)).orderBy(desc(callLogs.createdAt));
  }

  async seedDemoData(): Promise<void> {
    try {
      const personalExists = await this.getUserByEmail("democlient@contrahackathon.com");
      if (!personalExists) {
        await this.createUser({
          email: "democlient@contrahackathon.com",
          passwordHash: await hashPassword("democlient"),
          accountType: "personal",
        });
        console.log("Created demo personal account");
      }

      const businessExists = await this.getUserByEmail("demobusiness@contrahackathon.com");
      let businessUser: User | undefined;
      if (!businessExists) {
        businessUser = await this.createUser({
          email: "demobusiness@contrahackathon.com",
          passwordHash: await hashPassword("demobusiness"),
          accountType: "business",
        });
        console.log("Created demo business account");
      } else {
        businessUser = businessExists;
      }

      if (businessUser) {
        const existingLogs = await this.getCallLogsByUserId(businessUser.id);
        if (existingLogs.length === 0) {
          const mockCalls = [
            { title: "Abstract Living Room Piece", summary: "Modern abstract for main living area", style: "bold", palette: "warm", finish: "matte" },
            { title: "Bedroom Serenity Commission", summary: "Calming tones for master bedroom", style: "soft", palette: "cool", finish: "satin" },
            { title: "Office Statement Art", summary: "Professional piece for home office", style: "clean", palette: "neutral", finish: "glossy" },
            { title: "Kitchen Accent Painting", summary: "Vibrant piece for kitchen wall", style: "playful", palette: "warm", finish: "matte" },
            { title: "Entryway Welcome Art", summary: "First impression piece", style: "moody", palette: "neutral", finish: "satin" },
          ];

          for (const call of mockCalls) {
            await this.createCallLog({
              userId: businessUser.id,
              userEmail: businessUser.email,
              ...call,
            });
          }
          console.log("Created mock call logs for business account");
        }
      }
    } catch (error) {
      console.error("Error seeding demo data:", error);
    }
  }
}

export function generateSessionId(): string {
  return randomBytes(5).toString("hex");
}

export const storage = new DbStorage();

storage.seedDemoData().catch(console.error);
