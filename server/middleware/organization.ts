import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { organizations, organizationMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
    organizationId?: number;
    organizationRole?: string;
  }
}

export type OrgRole = "owner" | "admin" | "staff" | "viewer";

const roleHierarchy: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  staff: 2,
  viewer: 1,
};

export function hasPermission(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export async function loadOrganization(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next();
  }

  if (req.session.organizationId) {
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, req.session.userId),
          eq(organizationMembers.organizationId, req.session.organizationId),
          eq(organizationMembers.status, "active")
        )
      )
      .limit(1);

    if (membership) {
      req.session.organizationRole = membership.role;
      return next();
    }
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, req.session.userId),
        eq(organizationMembers.status, "active")
      )
    )
    .limit(1);

  if (membership) {
    req.session.organizationId = membership.organizationId;
    req.session.organizationRole = membership.role;
  }

  next();
}

export function requireOrganization(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!req.session.organizationId) {
    return res.status(403).json({ error: "No organization selected" });
  }
  next();
}

export function requireRole(minRole: OrgRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.session.organizationId) {
      return res.status(403).json({ error: "No organization selected" });
    }
    const userRole = req.session.organizationRole as OrgRole;
    if (!userRole || !hasPermission(userRole, minRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function canRead(req: Request, res: Response, next: NextFunction) {
  return requireRole("viewer")(req, res, next);
}

export function canWrite(req: Request, res: Response, next: NextFunction) {
  return requireRole("staff")(req, res, next);
}

export function canManage(req: Request, res: Response, next: NextFunction) {
  return requireRole("admin")(req, res, next);
}

export function canOwn(req: Request, res: Response, next: NextFunction) {
  return requireRole("owner")(req, res, next);
}
