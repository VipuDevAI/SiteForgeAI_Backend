import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.SESSION_SECRET || "siteforgeai-jwt-secret-key";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CLIENT";
  avatarUrl: string | null;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  planType: "free" | "pro" | "enterprise";
  subscriptionStatus: "free" | "active" | "past_due" | "cancelled";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionEndDate: Date | null;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: UserSafe;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: UserSafe): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role as "ADMIN" | "CLIENT",
    name: "",
    avatarUrl: null,
    aiGenerationsUsed: 0,
    aiGenerationsLimit: 3,
    planType: "free",
    subscriptionStatus: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
  };

  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function stripPassword(user: any): UserSafe {
  const { password, ...userSafe } = user;
  return userSafe as UserSafe;
}
