import {
  users,
  projects,
  templates,
  media,
  aiGenerations,
  type User,
  type InsertUser,
  type UserSafe,
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type Media as MediaType,
  type InsertMedia,
  type AiGeneration,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<UserSafe[]>;
  updateUserRole(id: string, role: "ADMIN" | "CLIENT"): Promise<UserSafe | undefined>;
  deleteUser(id: string): Promise<boolean>;

  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject & { userId: string }): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getAllProjectsCount(): Promise<number>;
  getPublishedProjectsCount(): Promise<number>;

  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  getMedia(userId: string): Promise<MediaType[]>;
  createMedia(mediaItem: InsertMedia & { userId: string }): Promise<MediaType>;
  deleteMedia(id: string): Promise<boolean>;

  getUserStats(userId: string): Promise<{
    totalProjects: number;
    publishedSites: number;
    templatesUsed: number;
    storageUsed: string;
  }>;

  getAdminStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    publishedSites: number;
    activeUsers: number;
  }>;

  getAiUsage(userId: string): Promise<{ used: number; limit: number; remaining: number }>;
  incrementAiUsage(userId: string): Promise<boolean>;
  logAiGeneration(userId: string, prompt: string, result: string, tokensUsed: number): Promise<AiGeneration>;
  
  getSubscriptionStatus(userId: string): Promise<{
    planType: string;
    status: string;
    isBlocked: boolean;
    canUseAi: boolean;
  }>;
  updateSubscription(userId: string, planType: "free" | "pro" | "enterprise", status: "free" | "active" | "past_due" | "cancelled"): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<UserSafe[]> {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        aiGenerationsUsed: users.aiGenerationsUsed,
        aiGenerationsLimit: users.aiGenerationsLimit,
        planType: users.planType,
        subscriptionStatus: users.subscriptionStatus,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionEndDate: users.subscriptionEndDate,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return allUsers;
  }

  async updateUserRole(id: string, role: "ADMIN" | "CLIENT"): Promise<UserSafe | undefined> {
    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        aiGenerationsUsed: users.aiGenerationsUsed,
        aiGenerationsLimit: users.aiGenerationsLimit,
        planType: users.planType,
        subscriptionStatus: users.subscriptionStatus,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionEndDate: users.subscriptionEndDate,
        createdAt: users.createdAt,
      });
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getProjects(userId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject & { userId: string }): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getAllProjectsCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(projects);
    return result?.count || 0;
  }

  async getPublishedProjectsCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, "published"));
    return result?.count || 0;
  }

  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  async getMedia(userId: string): Promise<MediaType[]> {
    return db
      .select()
      .from(media)
      .where(eq(media.userId, userId))
      .orderBy(desc(media.createdAt));
  }

  async createMedia(mediaItem: InsertMedia & { userId: string }): Promise<MediaType> {
    const [newMedia] = await db.insert(media).values(mediaItem).returning();
    return newMedia;
  }

  async deleteMedia(id: string): Promise<boolean> {
    const result = await db.delete(media).where(eq(media.id, id)).returning();
    return result.length > 0;
  }

  async getUserStats(userId: string): Promise<{
    totalProjects: number;
    publishedSites: number;
    templatesUsed: number;
    storageUsed: string;
  }> {
    const userProjects = await this.getProjects(userId);
    const publishedCount = userProjects.filter((p) => p.status === "published").length;
    const templatesUsedCount = userProjects.filter((p) => p.templateId).length;

    return {
      totalProjects: userProjects.length,
      publishedSites: publishedCount,
      templatesUsed: templatesUsedCount,
      storageUsed: "0 MB",
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    publishedSites: number;
    activeUsers: number;
  }> {
    const [usersCount] = await db.select({ count: count() }).from(users);
    const [projectsCount] = await db.select({ count: count() }).from(projects);
    const [publishedCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, "published"));

    return {
      totalUsers: usersCount?.count || 0,
      totalProjects: projectsCount?.count || 0,
      publishedSites: publishedCount?.count || 0,
      activeUsers: Math.floor((usersCount?.count || 0) * 0.7),
    };
  }

  async getAiUsage(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { used: 0, limit: 3, remaining: 3 };
    }
    const used = user.aiGenerationsUsed;
    const limit = user.aiGenerationsLimit;
    return { used, limit, remaining: Math.max(0, limit - used) };
  }

  async incrementAiUsage(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const hasPaidPlan = user.planType === "pro" || user.planType === "enterprise";
    const isActiveSubscription = user.subscriptionStatus === "active";
    
    if (hasPaidPlan && isActiveSubscription) {
      return true;
    }
    
    if (user.aiGenerationsUsed >= user.aiGenerationsLimit) {
      return false;
    }

    await db
      .update(users)
      .set({ aiGenerationsUsed: user.aiGenerationsUsed + 1 })
      .where(eq(users.id, userId));
    
    return true;
  }

  async logAiGeneration(userId: string, prompt: string, result: string, tokensUsed: number): Promise<AiGeneration> {
    const [generation] = await db
      .insert(aiGenerations)
      .values({ userId, prompt, result, tokensUsed })
      .returning();
    return generation;
  }

  async getSubscriptionStatus(userId: string): Promise<{
    planType: string;
    status: string;
    isBlocked: boolean;
    canUseAi: boolean;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { planType: "free", status: "free", isBlocked: false, canUseAi: true };
    }

    const planType = user.planType;
    const status = user.subscriptionStatus;
    
    const isBlocked = status === "past_due" || status === "cancelled";
    
    const hasCredits = user.aiGenerationsUsed < user.aiGenerationsLimit;
    const hasPaidPlan = planType === "pro" || planType === "enterprise";
    const canUseAi = !isBlocked && (hasCredits || hasPaidPlan);

    return { planType, status, isBlocked, canUseAi };
  }

  async updateSubscription(
    userId: string, 
    planType: "free" | "pro" | "enterprise", 
    status: "free" | "active" | "past_due" | "cancelled"
  ): Promise<void> {
    const limits: Record<string, number> = {
      free: 3,
      pro: 999999,
      enterprise: 999999,
    };

    const updateData: Record<string, unknown> = { 
      planType, 
      subscriptionStatus: status,
      aiGenerationsLimit: limits[planType],
    };
    
    if (planType === "free") {
      updateData.aiGenerationsUsed = 0;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
