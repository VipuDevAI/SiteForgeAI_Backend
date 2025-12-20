import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["ADMIN", "CLIENT"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "published", "archived"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "active", "past_due", "cancelled"]);
export const planTypeEnum = pgEnum("plan_type", ["free", "pro", "enterprise"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").default("CLIENT").notNull(),
  avatarUrl: text("avatar_url"),
  aiGenerationsUsed: integer("ai_generations_used").default(0).notNull(),
  aiGenerationsLimit: integer("ai_generations_limit").default(3).notNull(),
  planType: planTypeEnum("plan_type").default("free").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => templates.id),
  status: projectStatusEnum("status").default("draft").notNull(),
  domain: text("domain"),
  thumbnail: text("thumbnail"),
  generatedHtml: text("generated_html"),
  generatedCss: text("generated_css"),
  businessType: text("business_type"),
  primaryColor: text("primary_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [projects.templateId],
    references: [templates.id],
  }),
}));

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  category: text("category").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templatesRelations = relations(templates, ({ many }) => ({
  projects: many(projects),
}));

export const media = pgTable("media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaRelations = relations(media, ({ one }) => ({
  user: one(users, {
    fields: [media.userId],
    references: [users.id],
  }),
}));

export const aiGenerations = pgTable("ai_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  result: text("result"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiGenerationsRelations = relations(aiGenerations, ({ one }) => ({
  user: one(users, {
    fields: [aiGenerations.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserSafe = Omit<User, "password">;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof media.$inferSelect;

export const insertAiGenerationSchema = createInsertSchema(aiGenerations).omit({
  id: true,
  createdAt: true,
  userId: true,
  result: true,
  tokensUsed: true,
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  type: z.enum(["content", "design", "seo"]).default("content"),
});

export type InsertAiGeneration = z.infer<typeof insertAiGenerationSchema>;
export type AiGeneration = typeof aiGenerations.$inferSelect;
