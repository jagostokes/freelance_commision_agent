import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull().default("personal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  notes: text("notes"), // Full conversation transcript/notes
  style: varchar("style", { length: 100 }),
  palette: varchar("palette", { length: 100 }),
  finish: varchar("finish", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for database tables
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertCallLogSchema = createInsertSchema(callLogs).omit({ id: true, createdAt: true });
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({ id: true, createdAt: true });
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type AuthSession = typeof authSessions.$inferSelect;

// Account type enum
export const AccountTypeSchema = z.enum(["personal", "business"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// Auth request schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  accountType: AccountTypeSchema,
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

// Role type for messages
export const RoleSchema = z.enum(["client", "agent"]);
export type Role = z.infer<typeof RoleSchema>;

// Message in conversation
export const MessageSchema = z.object({
  role: RoleSchema,
  text: z.string(),
  ts: z.number(), // Unix timestamp in milliseconds
});
export type Message = z.infer<typeof MessageSchema>;

// Todo status
export const TodoStatusSchema = z.enum(["todo", "done"]);
export type TodoStatus = z.infer<typeof TodoStatusSchema>;

// Todo item
export const TodoSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: TodoStatusSchema,
});
export type Todo = z.infer<typeof TodoSchema>;

// Painting brief being built during conversation
export const PaintingBriefSchema = z.object({
  style: z.string().nullable().default(null),
  palette: z.string().nullable().default(null),
  finish: z.string().nullable().default(null),
  vibe: z.array(z.string()).default([]),
  rooms: z.array(z.string()).default([]),
  constraints: z.record(z.string(), z.any()).default({}),
  timeline: z.string().nullable().default(null),
  budget: z.string().nullable().default(null),
  openQuestions: z.array(z.string()).default([]),
});
export type PaintingBrief = z.infer<typeof PaintingBriefSchema>;

// Approval event
export const ApprovalSchema = z.object({
  ts: z.number(),
  text: z.string(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

// Complete session
export const SessionSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  messages: z.array(MessageSchema).default([]),
  brief: PaintingBriefSchema.default({}),
  todos: z.array(TodoSchema).default([]),
  approvals: z.array(ApprovalSchema).default([]),
});
export type Session = z.infer<typeof SessionSchema>;

// UI Prompt Option
export const UIPromptOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  image: z.string(),
});
export type UIPromptOption = z.infer<typeof UIPromptOptionSchema>;

// WebSocket message types - Client to Server
export const UIResponseMsgSchema = z.object({
  type: z.literal("UI_RESPONSE"),
  promptId: z.string(),
  selectedOptionId: z.string(),
});
export type UIResponseMsg = z.infer<typeof UIResponseMsgSchema>;

export const TodoConfirmMsgSchema = z.object({
  type: z.literal("TODO_CONFIRM"),
  ok: z.boolean(),
});
export type TodoConfirmMsg = z.infer<typeof TodoConfirmMsgSchema>;

export const PingMsgSchema = z.object({
  type: z.literal("PING"),
  ts: z.number(),
});
export type PingMsg = z.infer<typeof PingMsgSchema>;

// WebSocket message types - Server to Client
export const UIPromptMsgSchema = z.object({
  type: z.literal("UI_PROMPT"),
  promptId: z.string(),
  title: z.string(),
  options: z.array(UIPromptOptionSchema),
});
export type UIPromptMsg = z.infer<typeof UIPromptMsgSchema>;

export const TodoPreviewMsgSchema = z.object({
  type: z.literal("TODO_PREVIEW"),
  items: z.array(z.string()),
});
export type TodoPreviewMsg = z.infer<typeof TodoPreviewMsgSchema>;

export const CallFinishedMsgSchema = z.object({
  type: z.literal("CALL_FINISHED"),
  sessionId: z.string(),
});
export type CallFinishedMsg = z.infer<typeof CallFinishedMsgSchema>;

export const ErrorMsgSchema = z.object({
  type: z.literal("ERROR"),
  error: z.string(),
});
export type ErrorMsg = z.infer<typeof ErrorMsgSchema>;
