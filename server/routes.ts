import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  hashPassword,
  comparePassword,
  generateToken,
  authMiddleware,
  adminMiddleware,
  stripPassword,
  type AuthRequest,
} from "./auth";
import { signupSchema, loginSchema, insertProjectSchema, aiGenerateSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: "CLIENT",
      });

      const userSafe = stripPassword(user);
      const token = generateToken(userSafe);

      res.status(201).json({ token, user: userSafe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await comparePassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const userSafe = stripPassword(user);
      const token = generateToken(userSafe);

      res.json({ token, user: userSafe });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(stripPassword(user));
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const projects = await storage.getProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const templateId = validatedData.templateId && validatedData.templateId !== "none" 
        ? validatedData.templateId 
        : null;
      const project = await storage.createProject({
        ...validatedData,
        templateId,
        userId: req.user!.id,
      });
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertProjectSchema.partial().parse(req.body);
      const updated = await storage.updateProject(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templateList = await storage.getTemplates();
      res.json(templateList);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/media", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const mediaList = await storage.getMedia(req.user!.id);
      res.json(mediaList);
    } catch (error) {
      console.error("Get media error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const updateRoleSchema = z.object({
    role: z.enum(["ADMIN", "CLIENT"]),
  });

  app.patch("/api/admin/users/:id/role", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const validatedData = updateRoleSchema.parse(req.body);

      const updated = await storage.updateUserRole(req.params.id, validatedData.role);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json({
        ...stats,
        pageViews: 45234,
        avgSessionDuration: "4m 32s",
        conversionRate: "4.2%",
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ai/usage", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const usage = await storage.getAiUsage(req.user!.id);
      const subscription = await storage.getSubscriptionStatus(req.user!.id);
      res.json({ ...usage, ...subscription });
    } catch (error) {
      console.error("Get AI usage error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/subscription", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionStatus(req.user!.id);
      res.json(subscription);
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ai/generate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const validatedData = aiGenerateSchema.parse(req.body);
      
      const subscription = await storage.getSubscriptionStatus(req.user!.id);
      
      if (subscription.isBlocked) {
        return res.status(402).json({
          message: "Your subscription requires payment. Please upgrade to continue using AI features.",
          requiresPayment: true,
          subscription
        });
      }

      if (!subscription.canUseAi) {
        return res.status(403).json({ 
          message: "AI generation limit reached. Upgrade your plan for unlimited generations.",
          requiresUpgrade: true,
          subscription
        });
      }

      const usage = await storage.getAiUsage(req.user!.id);

      let result: string;
      let tokensUsed: number;
      
      try {
        result = `Generated content for: ${validatedData.prompt}. This is a placeholder - connect OpenAI API for real AI generation.`;
        tokensUsed = Math.floor(validatedData.prompt.length * 1.5);
      } catch (aiError) {
        console.error("AI provider error:", aiError);
        return res.status(503).json({ 
          message: "AI service temporarily unavailable. Please try again. Your credits were not used." 
        });
      }

      const canIncrement = await storage.incrementAiUsage(req.user!.id);
      if (!canIncrement) {
        return res.status(403).json({ 
          message: "AI generation limit reached. Upgrade your plan for more generations." 
        });
      }

      await storage.logAiGeneration(req.user!.id, validatedData.prompt, result, tokensUsed);
      
      const updatedUsage = await storage.getAiUsage(req.user!.id);
      
      res.json({ 
        result,
        tokensUsed,
        usage: updatedUsage
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("AI generation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
