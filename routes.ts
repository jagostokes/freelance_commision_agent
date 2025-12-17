import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateSessionId, hashPassword, verifyPassword } from "./storage";
import { log } from "./index";
import type { Session, Approval, User } from "@shared/schema";
import { LoginRequestSchema, SignupRequestSchema } from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    return next();
  }
  
  const session = await storage.getAuthSession(token);
  if (session) {
    const user = await storage.getUserById(session.userId);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Auth: Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = SignupRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const { email, password, accountType } = parsed.data;

      // Check if user exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user
      const user = await storage.createUser({
        email,
        passwordHash: await hashPassword(password),
        accountType,
      });

      // Create session
      const token = await storage.createAuthSession(user.id);

      log(`User signed up: ${email} (${accountType})`);
      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, accountType: user.accountType },
      });
    } catch (error) {
      log(`Signup error: ${error}`);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = LoginRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const { email, password } = parsed.data;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Create session
      const token = await storage.createAuthSession(user.id);

      log(`User logged in: ${email} (${user.accountType})`);
      res.json({
        token,
        user: { id: user.id, email: user.email, accountType: user.accountType },
      });
    } catch (error) {
      log(`Login error: ${error}`);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.deleteAuthSession(token);
      }
      res.json({ ok: true });
    } catch (error) {
      log(`Logout error: ${error}`);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Auth: Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      user: { id: req.user.id, email: req.user.email, accountType: req.user.accountType },
    });
  });

  // Call logs: Get logs for business user
  app.get("/api/call-logs", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.user.accountType !== "business") {
        return res.status(403).json({ error: "Business account required" });
      }

      // Business users see all call logs (they're the business reviewing consultations)
      const logs = await storage.getCallLogs();
      res.json(logs);
    } catch (error) {
      log(`Error fetching call logs: ${error}`);
      res.status(500).json({ error: "Failed to fetch call logs" });
    }
  });

  // Call logs: Create (when consultation ends) - requires authentication
  app.post("/api/call-logs", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required to save consultation" });
      }

      const { title, summary, notes, style, palette, finish } = req.body;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      const log_entry = await storage.createCallLog({
        userId: req.user.id,
        userEmail: req.user.email,
        title: title.slice(0, 255),
        summary: summary ? String(summary).slice(0, 1000) : null,
        notes: notes ? String(notes) : null, // Full transcript/notes
        style: style ? String(style).slice(0, 100) : null,
        palette: palette ? String(palette).slice(0, 100) : null,
        finish: finish ? String(finish).slice(0, 100) : null,
      });

      log(`Created call log for user ${req.user.email}: ${title}`);
      res.status(201).json(log_entry);
    } catch (error) {
      log(`Error creating call log: ${error}`);
      res.status(500).json({ error: "Failed to create call log" });
    }
  });

  // Create new session
  app.post("/api/session", async (_req, res) => {
    try {
      const sessionId = generateSessionId();
      await storage.createSession(sessionId);
      log(`Created new session: ${sessionId}`);
      res.status(201).json({ sessionId });
    } catch (error) {
      log(`Error creating session: ${error}`);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get session by ID
  app.get("/api/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      log(`Retrieved session: ${sessionId}`);
      res.json(session);
    } catch (error) {
      log(`Error getting session: ${error}`);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Get ElevenLabs signed URL
  app.get("/api/elevenlabs/signed-url", async (req, res) => {
    try {
      const agentId = (req.query.agent_id as string) || process.env.ELEVENLABS_AGENT_ID;
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!agentId) {
        log("ElevenLabs agent ID not configured");
        return res.status(500).json({ error: "ElevenLabs agent ID not configured" });
      }

      if (!apiKey) {
        log("ElevenLabs API key not configured");
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        log(`ElevenLabs API error: ${response.status} - ${errorText}`);
        return res.status(500).json({ error: `ElevenLabs API returned ${response.status}` });
      }

      const data = await response.json();
      log(`Successfully retrieved signed URL for agent: ${agentId}`);
      res.json(data);
    } catch (error) {
      log(`Error getting signed URL: ${error}`);
      res.status(500).json({ error: "Failed to get signed URL" });
    }
  });

  // WebSocket server for session persistence
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      log("WebSocket connection rejected: missing sessionId");
      ws.close(1008, "Missing sessionId parameter");
      return;
    }

    log(`WebSocket connected: sessionId=${sessionId}`);

    // Load or create session
    let session = await storage.getSession(sessionId);
    if (!session) {
      log(`Session not found, creating new: ${sessionId}`);
      session = await storage.createSession(sessionId);
    }

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received WS message: ${JSON.stringify(message).slice(0, 200)}`);

        if (message.type === "UI_RESPONSE") {
          // Record approval
          const approval: Approval = {
            ts: Date.now(),
            text: `UI_RESPONSE ${message.promptId} -> ${message.selectedOptionId}`,
          };
          await storage.addApproval(sessionId, approval);

          // Update brief based on promptId
          const promptId = message.promptId.toLowerCase();
          if (promptId.startsWith("style")) {
            await storage.updateBrief(sessionId, { style: message.selectedOptionId });
            log(`Updated brief.style: ${message.selectedOptionId}`);
          } else if (promptId.startsWith("palette")) {
            await storage.updateBrief(sessionId, { palette: message.selectedOptionId });
            log(`Updated brief.palette: ${message.selectedOptionId}`);
          } else if (promptId.startsWith("finish")) {
            await storage.updateBrief(sessionId, { finish: message.selectedOptionId });
            log(`Updated brief.finish: ${message.selectedOptionId}`);
          } else {
            // Store in constraints
            const currentSession = await storage.getSession(sessionId);
            if (currentSession) {
              const constraints = { ...currentSession.brief.constraints, [message.promptId]: message.selectedOptionId };
              await storage.updateBrief(sessionId, { constraints });
            }
          }
          
          log(`Session saved after UI_RESPONSE: ${sessionId}`);

        } else if (message.type === "TODO_CONFIRM") {
          const approval: Approval = {
            ts: Date.now(),
            text: `TODO_CONFIRM ok=${message.ok}`,
          };
          await storage.addApproval(sessionId, approval);

          if (message.ok) {
            log(`Client accepted todos, finishing call: ${sessionId}`);
            ws.send(JSON.stringify({ type: "CALL_FINISHED", sessionId }));
            ws.close(1000, "Call finished");
          } else {
            log(`Client rejected todos, sending revised preview`);
            ws.send(JSON.stringify({
              type: "TODO_PREVIEW",
              items: [
                "Review and finalize painting style preferences",
                "Confirm color palette selections",
                "Schedule initial consultation call",
                "Review project timeline and milestones",
                "Prepare room measurements and photos",
              ],
            }));
          }

        } else if (message.type === "AGENT_NOTE") {
          const noteMessage = message.message || "";
          if (noteMessage) {
            const approval: Approval = {
              ts: Date.now(),
              text: `AGENT_NOTE: ${noteMessage}`,
            };
            await storage.addApproval(sessionId, approval);
            log(`Agent note recorded: ${noteMessage.slice(0, 100)}`);
          }

        } else if (message.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG", ts: message.ts }));
          log(`Responded to PING: ${message.ts}`);
        }

      } catch (error) {
        log(`Error handling WebSocket message: ${error}`);
        ws.send(JSON.stringify({ type: "ERROR", error: String(error) }));
      }
    });

    ws.on("close", () => {
      log(`WebSocket disconnected: sessionId=${sessionId}`);
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error}`);
    });
  });

  return httpServer;
}
