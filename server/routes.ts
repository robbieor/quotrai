import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import { db, pool } from "./db";
import { users, userProfiles, clients, expenses, invoices, invoiceItems, savedItems, quotes, quoteItems, variationOrders, variationItems, recurringInvoices, recurringInvoiceItems, timeEntries, invoiceBranding, materials, organizations, organizationMembers, organizationInvitations, clockEntries, clockEntryBreaks, subscriptions, consultationRequests, employeeJobAssignments, holidayRequests, notifications, cashPayments, serviceTemplates, serviceTemplateItems, activityLogs, priceLists, priceListItems, supplierInvoices, supplierInvoiceItems, globalTemplates, globalTemplateItems, templateVersions, receiptScans, expensesFinal, expenseLineItems, teamChannels, channelMessages, messageReads, teamTasks, taskAssignments } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, inArray, isNotNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { loadOrganization, requireOrganization, requireRole, canRead, canWrite, canManage, canOwn } from "./middleware/organization";
import * as XLSX from "xlsx";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import crypto from "crypto";
import { uploadFile, downloadFile, deleteFile, generateReceiptKey, generateLogoKey, generateTeamMessageKey } from "./appStorage";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendTeamInviteEmail, isEmailConfigured, sendPasswordChangeEmail, sendMigrationRequestEmail } from "./email";
import { processAgentCommand, confirmDraft, cancelDraft, getCurrentDraft, getPersonalizedSuggestions, recordCommandUsage, parseInput } from "./agent";
import { geocodeEircode } from "./loqate";
import { jobs } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Keep Gemini for image/vision processing (receipt scanning)
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function generateOrgCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateUniqueOrgCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateOrgCode();
    const existing = await db.select().from(organizations).where(eq(organizations.code, code)).limit(1);
    if (existing.length === 0) {
      return code;
    }
  }
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const PgSession = connectPgSimple(session);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

async function logActivity(req: Request, action: string, entityType?: string, entityId?: number, details?: any) {
  try {
    await db.insert(activityLogs).values({
      userId: req.session.userId!,
      organizationId: req.session.organizationId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression());

  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for security. Please set it in your environment.");
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";

  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  app.use(loadOrganization);

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, companyName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationExpiry,
      }).returning();

      const orgCode = await generateUniqueOrgCode();
      const [org] = await db.insert(organizations).values({
        code: orgCode,
        name: companyName || "My Business",
        createdBy: newUser.id,
      }).returning();

      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: newUser.id,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      });

      await db.insert(userProfiles).values({ userId: newUser.id, organizationId: org.id });

      req.session.userId = newUser.id;
      req.session.organizationId = org.id;
      req.session.organizationRole = "owner";

      await sendVerificationEmail(email, verificationToken, companyName);

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        organizationId: org.id,
        organizationCode: org.code,
        emailVerified: false,
        verificationRequired: true,
        emailSent: isEmailConfigured(),
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;

      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active")))
        .limit(1);

      if (membership) {
        req.session.organizationId = membership.organizationId;
        req.session.organizationRole = membership.role;
      }

      res.json({
        id: user.id,
        email: user.email,
        organizationId: membership?.organizationId,
        role: membership?.role,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      if (user.verificationExpiry && new Date() > user.verificationExpiry) {
        return res.status(400).json({ error: "Verification token has expired" });
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationExpiry: null
        })
        .where(eq(users.id, user.id));

      const [membership] = await db
        .select({ orgName: organizations.name })
        .from(organizationMembers)
        .leftJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, user.id))
        .limit(1);

      await sendWelcomeEmail(user.email, membership?.orgName || undefined);

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", requireAuth, async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId!))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db
        .update(users)
        .set({ verificationToken, verificationExpiry })
        .where(eq(users.id, user.id));

      const [membership] = await db
        .select({ orgName: organizations.name })
        .from(organizationMembers)
        .leftJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, user.id))
        .limit(1);

      await sendVerificationEmail(user.email, verificationToken, membership?.orgName || undefined);

      res.json({
        success: true,
        message: "Verification email sent",
        emailSent: isEmailConfigured(),
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.json({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent"
        });
      }

      const resetToken = generateVerificationToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry
        })
        .where(eq(users.id, user.id));

      await sendPasswordResetEmail(user.email, resetToken);

      res.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent",
        emailSent: isEmailConfigured(),
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
        return res.status(400).json({ error: "Password reset token has expired" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null
        })
        .where(eq(users.id, user.id));

      res.json({ success: true, message: "Password has been reset successfully" });

      // Send confirmation email
      await sendPasswordChangeEmail(user.email);
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.delete("/api/auth/account", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      // Find organizations where this user is the sole owner
      const ownedOrgs = await db
        .select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.role, "owner")
        ));

      // For each owned org, check if user is the only owner
      for (const org of ownedOrgs) {
        const owners = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(
            eq(organizationMembers.organizationId, org.organizationId),
            eq(organizationMembers.role, "owner")
          ));

        // If sole owner, delete the organization (cascades to all org data)
        if (owners.length === 1) {
          await db.delete(organizations).where(eq(organizations.id, org.organizationId));
        }
      }

      // Now delete the user (cascades to remaining user-specific data)
      await db.delete(users).where(eq(users.id, userId));

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

      let currentOrg = null;
      let allOrgs: Array<{ id: number; name: string; role: string }> = [];

      const memberships = await db
        .select({
          organizationId: organizationMembers.organizationId,
          role: organizationMembers.role,
          orgName: organizations.name,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active")));

      allOrgs = memberships.map(m => ({
        id: m.organizationId,
        name: m.orgName,
        role: m.role,
      }));

      if (req.session.organizationId) {
        currentOrg = allOrgs.find(o => o.id === req.session.organizationId) || allOrgs[0] || null;
      } else if (allOrgs.length > 0) {
        currentOrg = allOrgs[0];
        req.session.organizationId = currentOrg.id;
        req.session.organizationRole = currentOrg.role;
      }

      res.json({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
        profile,
        currentOrganization: currentOrg,
        organizations: allOrgs,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, req.session.userId!)).limit(1);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.put("/api/profile", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const {
        businessName, businessOwnerName, businessNumber, phone, mobile, website, address, address2, address3, vatNumber, tradeType, county,
        // Payment Methods
        paypalEmail, chequePayableTo, paymentInstructions,
        // Invoice/Quote Number Settings
        invoiceNumberPrefix, quoteNumberPrefix, nextInvoiceNumber, nextQuoteNumber,
        // Default Email Settings
        defaultEmailSubject, defaultEmailMessage, sendEmailCopy
      } = req.body;

      const updateData: Record<string, any> = { updatedAt: new Date() };

      // Business Details
      if (businessName !== undefined) updateData.businessName = businessName;
      if (businessOwnerName !== undefined) updateData.businessOwnerName = businessOwnerName;
      if (businessNumber !== undefined) updateData.businessNumber = businessNumber;
      if (phone !== undefined) updateData.phone = phone;
      if (mobile !== undefined) updateData.mobile = mobile;
      if (website !== undefined) updateData.website = website;
      if (address !== undefined) updateData.address = address;
      if (address2 !== undefined) updateData.address2 = address2;
      if (address3 !== undefined) updateData.address3 = address3;
      if (vatNumber !== undefined) updateData.vatNumber = vatNumber;
      if (tradeType !== undefined) updateData.tradeType = tradeType;
      if (county !== undefined) updateData.county = county;

      // Payment Methods
      if (paypalEmail !== undefined) updateData.paypalEmail = paypalEmail;
      if (chequePayableTo !== undefined) updateData.chequePayableTo = chequePayableTo;
      if (paymentInstructions !== undefined) updateData.paymentInstructions = paymentInstructions;

      // Invoice/Quote Number Settings
      if (invoiceNumberPrefix !== undefined) updateData.invoiceNumberPrefix = invoiceNumberPrefix;
      if (quoteNumberPrefix !== undefined) updateData.quoteNumberPrefix = quoteNumberPrefix;
      if (nextInvoiceNumber !== undefined) updateData.nextInvoiceNumber = nextInvoiceNumber;
      if (nextQuoteNumber !== undefined) updateData.nextQuoteNumber = nextQuoteNumber;

      // Default Email Settings
      if (defaultEmailSubject !== undefined) updateData.defaultEmailSubject = defaultEmailSubject;
      if (defaultEmailMessage !== undefined) updateData.defaultEmailMessage = defaultEmailMessage;
      if (sendEmailCopy !== undefined) updateData.sendEmailCopy = sendEmailCopy;

      const [profile] = await db
        .update(userProfiles)
        .set(updateData)
        .where(eq(userProfiles.userId, req.session.userId!))
        .returning();

      if (tradeType && req.session.organizationId) {
        const validTradeTypes = ["electrician", "plumber", "carpentry_joinery"];
        if (validTradeTypes.includes(tradeType)) {
          await db
            .update(organizations)
            .set({ tradeType, updatedAt: new Date() })
            .where(eq(organizations.id, req.session.organizationId));
        }
      }

      res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/storage/upload/receipt", requireAuth, canWrite, express.raw({ type: "image/*", limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId || null;
      const filename = req.headers["x-filename"] as string || `receipt-${Date.now()}.jpg`;
      const contentType = req.headers["content-type"] || "image/jpeg";

      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }

      const key = generateReceiptKey(userId, organizationId, filename);
      const result = await uploadFile(key, req.body, contentType);

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Upload failed" });
      }

      res.json({
        success: true,
        key: result.key,
        url: result.url
      });
    } catch (error) {
      console.error("Receipt upload error:", error);
      res.status(500).json({ error: "Failed to upload receipt" });
    }
  });

  app.post("/api/storage/upload/logo", requireAuth, canWrite, express.raw({ type: "image/*", limit: "5mb" }), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId || null;
      const filename = req.headers["x-filename"] as string || `logo-${Date.now()}.png`;
      const contentType = req.headers["content-type"] || "image/png";

      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }

      const key = generateLogoKey(userId, organizationId, filename);
      const result = await uploadFile(key, req.body, contentType);

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Upload failed" });
      }

      res.json({
        success: true,
        key: result.key,
        url: result.url
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  app.post("/api/storage/upload/team-message", requireAuth, requireOrganization, express.raw({ type: "image/*", limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const filename = req.headers["x-filename"] as string || `message-${Date.now()}.jpg`;
      const contentType = req.headers["content-type"] || "image/jpeg";

      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }

      const key = generateTeamMessageKey(organizationId, filename);
      const result = await uploadFile(key, req.body, contentType);

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Upload failed" });
      }

      res.json({
        success: true,
        key: result.key,
        url: result.url
      });
    } catch (error) {
      console.error("Team message upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.get("/api/storage/:key(*)", requireAuth, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;

      if (!key) {
        return res.status(400).json({ error: "Missing file key" });
      }

      const userPattern = `/user-${userId}/`;
      const orgPattern = organizationId ? `/org-${organizationId}/` : null;
      const isAuthorized = key.includes(userPattern) || (orgPattern && key.includes(orgPattern));

      if (!isAuthorized) {
        return res.status(403).json({ error: "Access denied to this file" });
      }

      const result = await downloadFile(key);

      if (!result.success || !result.data) {
        return res.status(404).json({ error: "File not found" });
      }

      const ext = key.split(".").pop()?.toLowerCase() || "";
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
      };

      res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(result.data);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.delete("/api/storage/:key(*)", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;

      if (!key) {
        return res.status(400).json({ error: "Missing file key" });
      }

      const userPattern = `/user-${userId}/`;
      const orgPattern = organizationId ? `/org-${organizationId}/` : null;
      const isAuthorized = key.includes(userPattern) || (orgPattern && key.includes(orgPattern));

      if (!isAuthorized) {
        return res.status(403).json({ error: "Access denied to this file" });
      }

      const result = await deleteFile(key);

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Delete failed" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("File delete error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  app.get("/api/branding", requireAuth, async (req: Request, res: Response) => {
    try {
      let [branding] = await db.select().from(invoiceBranding).where(eq(invoiceBranding.userId, req.session.userId!)).limit(1);
      if (!branding) {
        [branding] = await db.insert(invoiceBranding).values({
          userId: req.session.userId!,
        }).returning();
      }
      res.json(branding);
    } catch (error) {
      console.error("Get branding error:", error);
      res.status(500).json({ error: "Failed to get branding settings" });
    }
  });

  app.put("/api/branding", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { logoDataUri, primaryColor, accentColor, headerColor, template, footerText, termsText, showVatNumber, showPaymentDetails, showNotes } = req.body;

      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (primaryColor && !hexColorRegex.test(primaryColor)) {
        return res.status(400).json({ error: "Invalid primary color format" });
      }
      if (headerColor && !hexColorRegex.test(headerColor)) {
        return res.status(400).json({ error: "Invalid header color format" });
      }
      if (accentColor && !hexColorRegex.test(accentColor)) {
        return res.status(400).json({ error: "Invalid accent color format" });
      }

      const validTemplates = ["modern", "classic", "bold"];
      if (template && !validTemplates.includes(template)) {
        return res.status(400).json({ error: "Invalid template selection" });
      }

      const MAX_LOGO_SIZE = 500000;
      if (logoDataUri && logoDataUri.length > MAX_LOGO_SIZE) {
        return res.status(400).json({ error: "Logo image is too large. Please use an image under 500KB." });
      }

      const MAX_TEXT_LENGTH = 1000;
      if (footerText && footerText.length > MAX_TEXT_LENGTH) {
        return res.status(400).json({ error: "Footer text is too long" });
      }
      if (termsText && termsText.length > MAX_TEXT_LENGTH) {
        return res.status(400).json({ error: "Terms text is too long" });
      }

      let [existing] = await db.select().from(invoiceBranding).where(eq(invoiceBranding.userId, req.session.userId!)).limit(1);

      if (existing) {
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (logoDataUri !== undefined) updateData.logoDataUri = logoDataUri;
        if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
        if (accentColor !== undefined) updateData.accentColor = accentColor;
        if (headerColor !== undefined) updateData.headerColor = headerColor;
        if (template !== undefined) updateData.template = template;
        if (footerText !== undefined) updateData.footerText = footerText;
        if (termsText !== undefined) updateData.termsText = termsText;
        if (showVatNumber !== undefined) updateData.showVatNumber = showVatNumber;
        if (showPaymentDetails !== undefined) updateData.showPaymentDetails = showPaymentDetails;
        if (showNotes !== undefined) updateData.showNotes = showNotes;

        [existing] = await db.update(invoiceBranding).set(updateData).where(eq(invoiceBranding.userId, req.session.userId!)).returning();
      } else {
        [existing] = await db.insert(invoiceBranding).values({
          userId: req.session.userId!,
          logoDataUri,
          primaryColor,
          accentColor,
          headerColor,
          template,
          footerText,
          termsText,
          showVatNumber,
          showPaymentDetails,
          showNotes,
        }).returning();
      }

      res.json(existing);
    } catch (error) {
      console.error("Update branding error:", error);
      res.status(500).json({ error: "Failed to update branding settings" });
    }
  });
  app.get("/api/geocode/eircode/:eircode", requireAuth, async (req: Request, res: Response) => {
    try {
      const eircode = req.params.eircode;
      if (!eircode) {
        return res.status(400).json({ error: "Eircode is required" });
      }
      const geo = await geocodeEircode(eircode);
      if (!geo) {
        return res.status(404).json({ error: "Address not found for this Eircode" });
      }
      res.json(geo);
    } catch (error) {
      console.error("Geocode error:", error);
      res.status(500).json({ error: "Failed to geocode Eircode" });
    }
  });
  app.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
      const offset = parseInt(req.query.offset as string) || 0;

      const conditions = req.session.organizationId
        ? [eq(clients.organizationId, req.session.organizationId)]
        : [eq(clients.userId, req.session.userId!)];

      const result = await db.select().from(clients).where(and(...conditions)).orderBy(desc(clients.createdAt)).limit(limit).offset(offset);
      res.json(result);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ error: "Failed to get clients" });
    }
  });

  app.post("/api/clients", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { name, email, mobile, phone, address, eircode, paymentTerms, priceListId, notes, skipGeocode } = req.body;

      let lat = req.body.latitude;
      let lng = req.body.longitude;
      let finalAddress = address;

      // Geocode with Loqate if eircode is provided and not skipping
      if (eircode && !skipGeocode) {
        const geo = await geocodeEircode(eircode);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
          if (!finalAddress) finalAddress = geo.formattedAddress;
        }
      }

      const [client] = await db.insert(clients).values({
        userId: req.session.userId!,
        organizationId: req.session.organizationId,
        name,
        email: email || null,
        mobile: mobile || null,
        phone: phone || null,
        address: finalAddress || null,
        eircode: eircode || null,
        latitude: lat ? lat.toString() : null,
        longitude: lng ? lng.toString() : null,
        paymentTerms: paymentTerms || 30,
        priceListId: priceListId || null,
        notes: notes || null,
      }).returning();
      res.status(201).json(client);
    } catch (error) {
      console.error("Create client error:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      const [client] = await db.select().from(clients).where(and(eq(clients.id, parseInt(req.params.id)), accessCondition)).limit(1);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, client.id)).orderBy(desc(invoices.createdAt));
      res.json({ ...client, invoices: clientInvoices });
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ error: "Failed to get client" });
    }
  });

  app.put("/api/clients/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { name, email, mobile, phone, address, eircode, paymentTerms, priceListId, notes, skipGeocode } = req.body;
      const clientId = parseInt(req.params.id);

      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      let lat = req.body.latitude;
      let lng = req.body.longitude;
      let finalAddress = address;

      // Geocode with Loqate if eircode is provided and not skipping
      if (eircode && !skipGeocode) {
        const geo = await geocodeEircode(eircode);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
          if (!finalAddress) finalAddress = geo.formattedAddress;
        }
      }

      const [client] = await db.update(clients).set({
        name,
        email: email || undefined,
        mobile: mobile || undefined,
        phone: phone || undefined,
        address: finalAddress || undefined,
        eircode: eircode || undefined,
        latitude: lat ? lat.toString() : undefined,
        longitude: lng ? lng.toString() : undefined,
        paymentTerms,
        priceListId: priceListId !== undefined ? priceListId : undefined,
        notes,
        updatedAt: new Date(),
      }).where(and(eq(clients.id, clientId), accessCondition)).returning();

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(client);
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      await db.delete(clients).where(and(eq(clients.id, parseInt(req.params.id)), accessCondition));
      res.status(204).send();
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Price Lists API
  app.get("/api/price-lists", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required for price lists" });
      }
      const result = await db.select().from(priceLists)
        .where(eq(priceLists.organizationId, req.session.organizationId))
        .orderBy(desc(priceLists.createdAt));
      res.json(result);
    } catch (error) {
      console.error("Get price lists error:", error);
      res.status(500).json({ error: "Failed to get price lists" });
    }
  });

  app.post("/api/price-lists", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required for price lists" });
      }
      const { name, description, isDefault, currency, effectiveFrom, effectiveTo, isActive } = req.body;

      // If setting as default, unset other defaults
      if (isDefault) {
        await db.update(priceLists)
          .set({ isDefault: false })
          .where(eq(priceLists.organizationId, req.session.organizationId));
      }

      const [priceList] = await db.insert(priceLists).values({
        organizationId: req.session.organizationId,
        name,
        description,
        isDefault: isDefault || false,
        currency: currency || "EUR",
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: isActive !== false,
      }).returning();

      await logActivity(req, "create_price_list", "price_list", priceList.id, { name });
      res.status(201).json(priceList);
    } catch (error) {
      console.error("Create price list error:", error);
      res.status(500).json({ error: "Failed to create price list" });
    }
  });

  app.get("/api/price-lists/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }
      const [priceList] = await db.select().from(priceLists)
        .where(and(
          eq(priceLists.id, parseInt(req.params.id)),
          eq(priceLists.organizationId, req.session.organizationId)
        )).limit(1);

      if (!priceList) {
        return res.status(404).json({ error: "Price list not found" });
      }

      // Get items for this price list
      const items = await db.select().from(priceListItems)
        .where(eq(priceListItems.priceListId, priceList.id))
        .orderBy(priceListItems.sortOrder, priceListItems.name);

      res.json({ ...priceList, items });
    } catch (error) {
      console.error("Get price list error:", error);
      res.status(500).json({ error: "Failed to get price list" });
    }
  });

  app.put("/api/price-lists/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }
      const { name, description, isDefault, currency, effectiveFrom, effectiveTo, isActive } = req.body;

      // If setting as default, unset other defaults
      if (isDefault) {
        await db.update(priceLists)
          .set({ isDefault: false })
          .where(eq(priceLists.organizationId, req.session.organizationId));
      }

      const [priceList] = await db.update(priceLists).set({
        name,
        description,
        isDefault,
        currency,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive,
        updatedAt: new Date(),
      }).where(and(
        eq(priceLists.id, parseInt(req.params.id)),
        eq(priceLists.organizationId, req.session.organizationId)
      )).returning();

      res.json(priceList);
    } catch (error) {
      console.error("Update price list error:", error);
      res.status(500).json({ error: "Failed to update price list" });
    }
  });

  app.delete("/api/price-lists/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }
      await db.delete(priceLists).where(and(
        eq(priceLists.id, parseInt(req.params.id)),
        eq(priceLists.organizationId, req.session.organizationId)
      ));
      res.status(204).send();
    } catch (error) {
      console.error("Delete price list error:", error);
      res.status(500).json({ error: "Failed to delete price list" });
    }
  });

  // Price List Items API
  app.get("/api/price-lists/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }
      // Verify access to the price list
      const [priceList] = await db.select().from(priceLists)
        .where(and(
          eq(priceLists.id, parseInt(req.params.id)),
          eq(priceLists.organizationId, req.session.organizationId)
        )).limit(1);

      if (!priceList) {
        return res.status(404).json({ error: "Price list not found" });
      }

      const items = await db.select().from(priceListItems)
        .where(eq(priceListItems.priceListId, priceList.id))
        .orderBy(priceListItems.sortOrder, priceListItems.name);

      res.json(items);
    } catch (error) {
      console.error("Get price list items error:", error);
      res.status(500).json({ error: "Failed to get price list items" });
    }
  });

  app.post("/api/price-lists/:id/items", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }
      // Verify access to the price list
      const [priceList] = await db.select().from(priceLists)
        .where(and(
          eq(priceLists.id, parseInt(req.params.id)),
          eq(priceLists.organizationId, req.session.organizationId)
        )).limit(1);

      if (!priceList) {
        return res.status(404).json({ error: "Price list not found" });
      }

      const { name, description, category, subCategory, sku, unit, unitPrice, vatRate, minQuantity, maxQuantity, isActive, sortOrder } = req.body;

      const [item] = await db.insert(priceListItems).values({
        priceListId: priceList.id,
        name,
        description,
        category,
        subCategory: category === "Materials" ? subCategory : null,
        sku,
        unit: unit || "each",
        unitPrice: unitPrice?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        minQuantity: minQuantity?.toString(),
        maxQuantity: maxQuantity?.toString(),
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      }).returning();

      res.status(201).json(item);
    } catch (error) {
      console.error("Create price list item error:", error);
      res.status(500).json({ error: "Failed to create price list item" });
    }
  });

  app.put("/api/price-list-items/:itemId", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      // Get the item and verify access via price list
      const [existingItem] = await db.select().from(priceListItems)
        .where(eq(priceListItems.id, parseInt(req.params.itemId))).limit(1);

      if (!existingItem) {
        return res.status(404).json({ error: "Price list item not found" });
      }

      const [priceList] = await db.select().from(priceLists)
        .where(and(
          eq(priceLists.id, existingItem.priceListId),
          eq(priceLists.organizationId, req.session.organizationId)
        )).limit(1);

      if (!priceList) {
        return res.status(404).json({ error: "Price list not found" });
      }

      const { name, description, category, subCategory, sku, unit, unitPrice, vatRate, minQuantity, maxQuantity, isActive, sortOrder } = req.body;

      const [item] = await db.update(priceListItems).set({
        name,
        description,
        category,
        subCategory: category === "Materials" ? subCategory : null,
        sku,
        unit,
        unitPrice: unitPrice?.toString(),
        vatRate: vatRate?.toString(),
        minQuantity: minQuantity?.toString(),
        maxQuantity: maxQuantity?.toString(),
        isActive,
        sortOrder,
        updatedAt: new Date(),
      }).where(eq(priceListItems.id, parseInt(req.params.itemId))).returning();

      res.json(item);
    } catch (error) {
      console.error("Update price list item error:", error);
      res.status(500).json({ error: "Failed to update price list item" });
    }
  });

  app.delete("/api/price-list-items/:itemId", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      if (!req.session.organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      // Get the item and verify access via price list
      const [existingItem] = await db.select().from(priceListItems)
        .where(eq(priceListItems.id, parseInt(req.params.itemId))).limit(1);

      if (!existingItem) {
        return res.status(404).json({ error: "Price list item not found" });
      }

      const [priceList] = await db.select().from(priceLists)
        .where(and(
          eq(priceLists.id, existingItem.priceListId),
          eq(priceLists.organizationId, req.session.organizationId)
        )).limit(1);

      if (!priceList) {
        return res.status(404).json({ error: "Price list not found" });
      }

      await db.delete(priceListItems).where(eq(priceListItems.id, parseInt(req.params.itemId)));
      res.status(204).send();
    } catch (error) {
      console.error("Delete price list item error:", error);
      res.status(500).json({ error: "Failed to delete price list item" });
    }
  });

  // Assign price list to client
  app.put("/api/clients/:id/price-list", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { priceListId } = req.body;

      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      // Verify price list exists and belongs to org
      if (priceListId) {
        const [priceList] = await db.select().from(priceLists)
          .where(and(
            eq(priceLists.id, priceListId),
            eq(priceLists.organizationId, req.session.organizationId!)
          )).limit(1);

        if (!priceList) {
          return res.status(400).json({ error: "Price list not found" });
        }
      }

      const [client] = await db.update(clients).set({
        priceListId: priceListId || null,
        updatedAt: new Date(),
      }).where(and(eq(clients.id, parseInt(req.params.id)), accessCondition)).returning();

      res.json(client);
    } catch (error) {
      console.error("Assign price list to client error:", error);
      res.status(500).json({ error: "Failed to assign price list to client" });
    }
  });

  // Get client's price list with items
  app.get("/api/clients/:id/price-list", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      const [client] = await db.select().from(clients)
        .where(and(eq(clients.id, parseInt(req.params.id)), accessCondition)).limit(1);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.priceListId) {
        // Return default price list if client doesn't have one assigned
        if (req.session.organizationId) {
          const [defaultList] = await db.select().from(priceLists)
            .where(and(
              eq(priceLists.organizationId, req.session.organizationId),
              eq(priceLists.isDefault, true)
            )).limit(1);

          if (defaultList) {
            const items = await db.select().from(priceListItems)
              .where(eq(priceListItems.priceListId, defaultList.id))
              .orderBy(priceListItems.sortOrder, priceListItems.name);
            return res.json({ ...defaultList, items, isClientDefault: false });
          }
        }
        return res.json(null);
      }

      const [priceList] = await db.select().from(priceLists)
        .where(eq(priceLists.id, client.priceListId)).limit(1);

      if (!priceList) {
        return res.json(null);
      }

      const items = await db.select().from(priceListItems)
        .where(eq(priceListItems.priceListId, priceList.id))
        .orderBy(priceListItems.sortOrder, priceListItems.name);

      res.json({ ...priceList, items, isClientDefault: true });
    } catch (error) {
      console.error("Get client price list error:", error);
      res.status(500).json({ error: "Failed to get client price list" });
    }
  });

  app.get("/api/expenses", requireAuth, async (req: Request, res: Response) => {
    try {
      const selectedYear = parseInt(req.query.year as string) || null;
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
      const offset = parseInt(req.query.offset as string) || 0;

      const accessCondition = req.session.organizationId
        ? eq(expenses.organizationId, req.session.organizationId)
        : eq(expenses.userId, req.session.userId!);

      let conditions = [accessCondition];

      if (selectedYear) {
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        conditions.push(gte(expenses.date, startOfYear));
        conditions.push(lte(expenses.date, endOfYear));
      }

      const result = await db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date)).limit(limit).offset(offset);
      res.json(result);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { date, vendor, amount, category, description, receiptImageUrl, jobId } = req.body;
      const [expense] = await db.insert(expenses).values({
        userId: req.session.userId!,
        organizationId: req.session.organizationId,
        date: new Date(date),
        vendor,
        amount,
        category,
        description,
        receiptImageUrl,
        jobId
      }).returning();

      // Log activity
      await logActivity(req, "create_expense", "expense", expense.id, { vendor, amount, category });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { date, vendor, amount, category, description, receiptImageUrl, jobId } = req.body;

      const accessCondition = req.session.organizationId
        ? eq(expenses.organizationId, req.session.organizationId)
        : eq(expenses.userId, req.session.userId!);

      const [expense] = await db.update(expenses).set({ date: new Date(date), vendor, amount, category, description, receiptImageUrl, jobId, updatedAt: new Date() }).where(and(eq(expenses.id, parseInt(req.params.id)), accessCondition)).returning();
      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(expenses.organizationId, req.session.organizationId)
        : eq(expenses.userId, req.session.userId!);

      await db.delete(expenses).where(and(eq(expenses.id, parseInt(req.params.id)), accessCondition));
      res.status(204).send();
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.post("/api/receipts/scan", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { imageBase64, imageUrl } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const prompt = `Analyze this receipt/invoice image and extract ALL the following information in JSON format. Be thorough and accurate:
{
  "supplierName": "store/business/supplier name",
  "supplierVatNumber": "VAT/Tax registration number if visible",
  "supplierAddress": "full address if visible",
  "receiptNumber": "receipt/invoice number if visible",
  "receiptDate": "date in YYYY-MM-DD format",
  "subtotal": "subtotal amount before VAT as a number (e.g., 45.50)",
  "vatAmount": "VAT/tax amount as a number",
  "total": "grand total amount as a number",
  "vatRate": "VAT rate as decimal (e.g., 0.23 for 23%)",
  "paymentMethod": "Cash, Card, Bank Transfer, or Credit if identifiable",
  "lineItems": [
    {
      "itemCode": "product code/SKU if visible",
      "description": "item description",
      "quantity": 1,
      "unit": "each",
      "unitPrice": 10.00,
      "lineTotal": 10.00,
      "category": "Materials, Tools, Parts, Supplies, or Other"
    }
  ],
  "category": "one of: Materials, Tools, Transport, Fuel, Equipment, Supplies, Food, Accommodation, Utilities, Insurance, Licensing, Training, Subcontractor, Vehicle, Office, Other",
  "confidence": "0-100 confidence score for extraction quality"
}
Extract every line item you can see. If you cannot extract a field, use null. Be accurate with amounts - look for the total or grand total. For Irish receipts, the standard VAT rate is 23%.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let extracted: any = { supplierName: null, total: null, receiptDate: null, lineItems: [], category: "Other", confidence: 0 };

      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("Failed to parse OCR JSON:", parseError);
        }
      }

      const [receiptScan] = await db.insert(receiptScans).values({
        organizationId,
        userId,
        imageUrl: imageUrl || "",
        status: "extracted",
        supplierName: extracted.supplierName,
        supplierVatNumber: extracted.supplierVatNumber,
        supplierAddress: extracted.supplierAddress,
        receiptDate: extracted.receiptDate ? new Date(extracted.receiptDate) : null,
        receiptNumber: extracted.receiptNumber,
        subtotal: extracted.subtotal?.toString() || null,
        vatAmount: extracted.vatAmount?.toString() || null,
        total: extracted.total?.toString() || null,
        vatRate: extracted.vatRate?.toString() || null,
        paymentMethod: extracted.paymentMethod,
        extractedLineItems: extracted.lineItems ? JSON.stringify(extracted.lineItems) : null,
        extractedRawJson: JSON.stringify(extracted),
        ocrConfidence: extracted.confidence?.toString() || null,
        currency: "EUR",
      }).returning();

      res.json({
        id: receiptScan.id,
        ...extracted,
        receiptScanId: receiptScan.id,
      });
    } catch (error) {
      console.error("Receipt scan error:", error);
      res.status(500).json({ error: "Failed to scan receipt" });
    }
  });

  app.get("/api/receipt-scans/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const scanId = parseInt(req.params.id);
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [scan] = await db.select().from(receiptScans)
        .where(and(eq(receiptScans.id, scanId), eq(receiptScans.organizationId, organizationId)));

      if (!scan) {
        return res.status(404).json({ error: "Receipt scan not found" });
      }

      res.json({
        ...scan,
        lineItems: scan.extractedLineItems ? JSON.parse(scan.extractedLineItems) : [],
      });
    } catch (error) {
      console.error("Get receipt scan error:", error);
      res.status(500).json({ error: "Failed to get receipt scan" });
    }
  });

  app.post("/api/receipt-scans/:id/finalize", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const scanId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [scan] = await db.select().from(receiptScans)
        .where(and(eq(receiptScans.id, scanId), eq(receiptScans.organizationId, organizationId)));

      if (!scan) {
        return res.status(404).json({ error: "Receipt scan not found" });
      }

      const {
        supplierName,
        supplierVatNumber,
        supplierAddress,
        receiptNumber,
        receiptDate,
        subtotal,
        vatAmount,
        total,
        vatRate,
        paymentMethod,
        category,
        description,
        lineItems,
        invoiceId,
        jobReference,
        notes,
        isVatReclaimable,
      } = req.body;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      const subscriberName = org?.name || "Unknown";

      const [expense] = await db.insert(expensesFinal).values({
        subscriberId: organizationId,
        subscriberName,
        organizationId,
        userId,
        receiptScanId: scanId,
        invoiceId: invoiceId || null,
        supplierName: supplierName || scan.supplierName || "Unknown Supplier",
        supplierVatNumber: supplierVatNumber || scan.supplierVatNumber,
        supplierAddress: supplierAddress || scan.supplierAddress,
        receiptNumber: receiptNumber || scan.receiptNumber,
        receiptDate: new Date(receiptDate || scan.receiptDate || new Date()),
        category: category || "Materials",
        description: description || null,
        subtotal: subtotal?.toString() || scan.subtotal || "0",
        vatAmount: vatAmount?.toString() || scan.vatAmount || "0",
        total: total?.toString() || scan.total || "0",
        vatRate: vatRate?.toString() || scan.vatRate || "0.23",
        currency: "EUR",
        paymentMethod: paymentMethod || scan.paymentMethod,
        lineItems: lineItems ? JSON.stringify(lineItems) : scan.extractedLineItems,
        receiptImageUrl: scan.imageUrl,
        entryMethod: "ocr_scan",
        isVatReclaimable: isVatReclaimable !== false,
        jobReference: jobReference || null,
        notes: notes || null,
        createdBy: userId,
      }).returning();

      if (lineItems && Array.isArray(lineItems)) {
        for (let i = 0; i < lineItems.length; i++) {
          const item = lineItems[i];
          await db.insert(expenseLineItems).values({
            expenseId: expense.id,
            itemCode: item.itemCode || null,
            description: item.description || "Item",
            category: item.category || null,
            quantity: item.quantity?.toString() || "1",
            unit: item.unit || "each",
            unitPrice: item.unitPrice?.toString() || "0",
            lineTotal: item.lineTotal?.toString() || "0",
            vatRate: item.vatRate?.toString() || null,
            sortOrder: i,
          });
        }
      }

      await db.update(receiptScans).set({ status: "finalized", updatedAt: new Date() }).where(eq(receiptScans.id, scanId));

      res.json({ success: true, expense });
    } catch (error) {
      console.error("Finalize receipt scan error:", error);
      res.status(500).json({ error: "Failed to finalize expense" });
    }
  });

  app.get("/api/expenses-final", requireAuth, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const allExpenses = await db.select().from(expensesFinal)
        .where(and(
          eq(expensesFinal.organizationId, organizationId),
          sql`${expensesFinal.deletedAt} IS NULL`
        ))
        .orderBy(desc(expensesFinal.receiptDate));

      res.json(allExpenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses-final", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const {
        supplierName,
        supplierVatNumber,
        supplierAddress,
        receiptNumber,
        receiptDate,
        subtotal,
        vatAmount,
        total,
        vatRate,
        paymentMethod,
        category,
        description,
        lineItems,
        invoiceId,
        jobReference,
        notes,
        isVatReclaimable,
        receiptImageUrl,
      } = req.body;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      const subscriberName = org?.name || "Unknown";

      const [expense] = await db.insert(expensesFinal).values({
        subscriberId: organizationId,
        subscriberName,
        organizationId,
        userId,
        receiptScanId: null,
        invoiceId: invoiceId || null,
        supplierName: supplierName || "Unknown Supplier",
        supplierVatNumber: supplierVatNumber || null,
        supplierAddress: supplierAddress || null,
        receiptNumber: receiptNumber || null,
        receiptDate: new Date(receiptDate || new Date()),
        category: category || "Materials",
        description: description || null,
        subtotal: subtotal?.toString() || "0",
        vatAmount: vatAmount?.toString() || "0",
        total: total?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        currency: "EUR",
        paymentMethod: paymentMethod || null,
        lineItems: lineItems ? JSON.stringify(lineItems) : null,
        receiptImageUrl: receiptImageUrl || null,
        entryMethod: "manual",
        isVatReclaimable: isVatReclaimable !== false,
        jobReference: jobReference || null,
        notes: notes || null,
        createdBy: userId,
      }).returning();

      if (lineItems && Array.isArray(lineItems)) {
        for (let i = 0; i < lineItems.length; i++) {
          const item = lineItems[i];
          await db.insert(expenseLineItems).values({
            expenseId: expense.id,
            itemCode: item.itemCode || null,
            description: item.description || "Item",
            category: item.category || null,
            quantity: item.quantity?.toString() || "1",
            unit: item.unit || "each",
            unitPrice: item.unitPrice?.toString() || "0",
            lineTotal: item.lineTotal?.toString() || "0",
            vatRate: item.vatRate?.toString() || null,
            sortOrder: i,
          });
        }
      }

      res.json({ success: true, expense });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.get("/api/expenses-final/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [expense] = await db.select().from(expensesFinal)
        .where(and(eq(expensesFinal.id, expenseId), eq(expensesFinal.organizationId, organizationId)));

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const items = await db.select().from(expenseLineItems)
        .where(eq(expenseLineItems.expenseId, expenseId))
        .orderBy(expenseLineItems.sortOrder);

      res.json({ ...expense, lineItems: items });
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({ error: "Failed to get expense" });
    }
  });

  app.patch("/api/expenses-final/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [existing] = await db.select().from(expensesFinal)
        .where(and(eq(expensesFinal.id, expenseId), eq(expensesFinal.organizationId, organizationId)));

      if (!existing) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const {
        supplierName,
        supplierVatNumber,
        supplierAddress,
        receiptNumber,
        receiptDate,
        subtotal,
        vatAmount,
        total,
        vatRate,
        paymentMethod,
        category,
        description,
        invoiceId,
        jobReference,
        notes,
        isVatReclaimable,
      } = req.body;

      await db.update(expensesFinal).set({
        supplierName: supplierName !== undefined ? supplierName : existing.supplierName,
        supplierVatNumber: supplierVatNumber !== undefined ? supplierVatNumber : existing.supplierVatNumber,
        supplierAddress: supplierAddress !== undefined ? supplierAddress : existing.supplierAddress,
        receiptNumber: receiptNumber !== undefined ? receiptNumber : existing.receiptNumber,
        receiptDate: receiptDate ? new Date(receiptDate) : existing.receiptDate,
        subtotal: subtotal !== undefined ? subtotal.toString() : existing.subtotal,
        vatAmount: vatAmount !== undefined ? vatAmount.toString() : existing.vatAmount,
        total: total !== undefined ? total.toString() : existing.total,
        vatRate: vatRate !== undefined ? vatRate.toString() : existing.vatRate,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        category: category !== undefined ? category : existing.category,
        description: description !== undefined ? description : existing.description,
        invoiceId: invoiceId !== undefined ? invoiceId : existing.invoiceId,
        jobReference: jobReference !== undefined ? jobReference : existing.jobReference,
        notes: notes !== undefined ? notes : existing.notes,
        isVatReclaimable: isVatReclaimable !== undefined ? isVatReclaimable : existing.isVatReclaimable,
        updatedAt: new Date(),
      }).where(eq(expensesFinal.id, expenseId));

      const [updated] = await db.select().from(expensesFinal).where(eq(expensesFinal.id, expenseId));
      res.json(updated);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses-final/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [existing] = await db.select().from(expensesFinal)
        .where(and(eq(expensesFinal.id, expenseId), eq(expensesFinal.organizationId, organizationId)));

      if (!existing) {
        return res.status(404).json({ error: "Expense not found" });
      }

      await db.update(expensesFinal).set({
        deletedAt: new Date(),
        deletedBy: userId,
        updatedAt: new Date(),
      }).where(eq(expensesFinal.id, expenseId));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.patch("/api/expenses-final/:id/attach-invoice", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { invoiceId } = req.body;
      const organizationId = req.session.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization required" });
      }

      const [existing] = await db.select().from(expensesFinal)
        .where(and(eq(expensesFinal.id, expenseId), eq(expensesFinal.organizationId, organizationId)));

      if (!existing) {
        return res.status(404).json({ error: "Expense not found" });
      }

      if (invoiceId) {
        const [invoice] = await db.select().from(invoices)
          .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)));
        if (!invoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }
      }

      await db.update(expensesFinal).set({
        invoiceId: invoiceId || null,
        updatedAt: new Date(),
      }).where(eq(expensesFinal.id, expenseId));

      const [updated] = await db.select().from(expensesFinal).where(eq(expensesFinal.id, expenseId));
      res.json(updated);
    } catch (error) {
      console.error("Attach invoice error:", error);
      res.status(500).json({ error: "Failed to attach invoice" });
    }
  });

  // Supplier Invoice Scanner - extracts line items from supplier invoices
  app.post("/api/invoices/scan-supplier", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Fetch existing materials for matching suggestions
      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const existingMaterials = await db.select({
        name: materials.name,
        unit: materials.unit,
        supplier: materials.supplier,
      }).from(materials).where(accessCondition);

      const uniqueMaterialNames = [...new Set(existingMaterials.map(m => m.name.toLowerCase().trim()))];
      const existingMaterialsList = uniqueMaterialNames.slice(0, 50).join(", ");

      const prompt = `Analyze this supplier invoice image and extract ALL line items. This is an invoice from an electrical/trade wholesaler or supplier.

Extract the following information in JSON format:
{
  "supplier": "supplier/wholesaler name (e.g., Kellihers, CEF, Edmundson, City Electrical)",
  "invoiceNumber": "invoice number if visible",
  "invoiceDate": "date in YYYY-MM-DD format",
  "totalAmount": "invoice total as a number",
  "items": [
    {
      "description": "exact description from invoice",
      "normalizedName": "simplified standard name (e.g., '20mm Conduit' instead of 'PVC Conduit 20mm 3M Length')",
      "quantity": 1,
      "unit": "each/m/box/pack/roll/length",
      "unitPrice": 0.00,
      "lineTotal": 0.00,
      "productCode": "product/part code if visible"
    }
  ]
}

Important:
- Extract EVERY line item, even if some fields are missing
- Normalize descriptions to common trade names where possible
- The unit should reflect how the item is sold (per meter, per box, each, etc.)
- If unit price isn't clear, calculate from line total / quantity
- Common Irish electrical suppliers: Kellihers, CEF, Edmundson, City Electrical, Electric Centre, Quilligan Electric

${existingMaterialsList.length > 0 ? `The user has previously logged these materials, try to match similar items: ${existingMaterialsList}` : ''}

Return valid JSON only.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        let extracted;
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", parseError);
          return res.json({
            supplier: null,
            invoiceNumber: null,
            invoiceDate: null,
            totalAmount: null,
            items: [],
            error: "Could not parse invoice data"
          });
        }

        // Validate and sanitize the response structure
        const validatedResponse = {
          supplier: typeof extracted.supplier === 'string' ? extracted.supplier : null,
          invoiceNumber: typeof extracted.invoiceNumber === 'string' ? extracted.invoiceNumber : null,
          invoiceDate: typeof extracted.invoiceDate === 'string' ? extracted.invoiceDate : null,
          totalAmount: typeof extracted.totalAmount === 'number' ? extracted.totalAmount : null,
          items: [] as any[],
        };

        // Validate and sanitize each item
        if (extracted.items && Array.isArray(extracted.items)) {
          for (const item of extracted.items) {
            const quantity = parseFloat(item.quantity) || 1;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const lineTotal = parseFloat(item.lineTotal) || (quantity * unitPrice);

            const validatedItem = {
              description: typeof item.description === 'string' ? item.description : '',
              normalizedName: typeof item.normalizedName === 'string' ? item.normalizedName : (item.description || ''),
              quantity: isNaN(quantity) ? 1 : quantity,
              unit: typeof item.unit === 'string' ? item.unit : 'each',
              unitPrice: isNaN(unitPrice) ? 0 : Math.round(unitPrice * 100) / 100,
              lineTotal: isNaN(lineTotal) ? 0 : Math.round(lineTotal * 100) / 100,
              productCode: typeof item.productCode === 'string' ? item.productCode : null,
              suggestedMatches: [] as string[],
            };

            // Find potential matches from existing materials
            const normalizedName = validatedItem.normalizedName.toLowerCase().trim();
            const matches = existingMaterials.filter(m => {
              const existingName = m.name.toLowerCase().trim();
              return existingName.includes(normalizedName) ||
                normalizedName.includes(existingName) ||
                existingName.split(" ").some((word: string) => normalizedName.includes(word) && word.length > 3);
            }).slice(0, 3);

            validatedItem.suggestedMatches = matches.map(m => m.name);
            validatedResponse.items.push(validatedItem);
          }
        }

        res.json(validatedResponse);
      } else {
        res.json({
          supplier: null,
          invoiceNumber: null,
          invoiceDate: null,
          totalAmount: null,
          items: [],
          error: "Could not extract invoice data"
        });
      }
    } catch (error) {
      console.error("Supplier invoice scan error:", error);
      res.status(500).json({ error: "Failed to scan supplier invoice" });
    }
  });

  // Bulk import materials from scanned invoice
  app.post("/api/materials/bulk-import", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { items, supplier, invoiceDate } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      const importedMaterials = [];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate required fields
        const name = item.name || item.normalizedName || item.description;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          errors.push({ index: i, error: "Missing material name" });
          continue;
        }

        // Parse and validate numeric fields
        const quantity = parseFloat(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);
        const lineTotal = parseFloat(item.lineTotal);

        const validQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
        const validUnitPrice = isNaN(unitPrice) || unitPrice < 0 ? 0 : Math.round(unitPrice * 100) / 100;
        const validLineTotal = isNaN(lineTotal) || lineTotal < 0
          ? Math.round(validQuantity * validUnitPrice * 100) / 100
          : Math.round(lineTotal * 100) / 100;

        // Validate date
        let validDate = new Date();
        if (invoiceDate) {
          const parsedDate = new Date(invoiceDate);
          if (!isNaN(parsedDate.getTime())) {
            validDate = parsedDate;
          }
        }

        try {
          const [newMaterial] = await db.insert(materials).values({
            userId: req.session.userId!,
            organizationId: req.session.organizationId || null,
            name: name.trim(),
            description: typeof item.description === 'string' ? item.description : null,
            quantity: validQuantity.toString(),
            unit: typeof item.unit === 'string' ? item.unit : "each",
            unitCost: validUnitPrice.toString(),
            totalCost: validLineTotal.toString(),
            supplier: typeof supplier === 'string' ? supplier : (typeof item.supplier === 'string' ? item.supplier : null),
            date: validDate,
            clientId: typeof item.clientId === 'number' ? item.clientId : null,
            notes: typeof item.productCode === 'string' ? `Product code: ${item.productCode}` : null,
          }).returning();

          importedMaterials.push(newMaterial);
        } catch (dbError) {
          console.error(`Failed to import item ${i}:`, dbError);
          errors.push({ index: i, error: "Database insert failed" });
        }
      }

      res.json({
        success: importedMaterials.length > 0,
        imported: importedMaterials.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        materials: importedMaterials
      });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: "Failed to import materials" });
    }
  });

  // Materials AI Chat endpoint
  app.post("/api/materials/ai-chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      // Fetch user's materials data for context
      const userMaterials = await db.select({
        material: materials,
        client: clients,
      }).from(materials)
        .leftJoin(clients, eq(materials.clientId, clients.id))
        .where(accessCondition)
        .orderBy(desc(materials.date));

      // Calculate supplier analytics
      const supplierStats: Record<string, { totalSpent: number; itemCount: number; materials: string[] }> = {};
      const materialPrices: Record<string, { prices: number[]; suppliers: string[]; dates: Date[] }> = {};

      for (const m of userMaterials) {
        const supplier = m.material.supplier || "Unknown";
        const materialName = m.material.name.toLowerCase().trim();
        const unitCost = parseFloat(m.material.unitCost || "0");
        const totalCost = parseFloat(m.material.totalCost || "0");

        // Track supplier spending
        if (!supplierStats[supplier]) {
          supplierStats[supplier] = { totalSpent: 0, itemCount: 0, materials: [] };
        }
        supplierStats[supplier].totalSpent += totalCost;
        supplierStats[supplier].itemCount += 1;
        if (!supplierStats[supplier].materials.includes(m.material.name)) {
          supplierStats[supplier].materials.push(m.material.name);
        }

        // Track material prices over time
        if (unitCost > 0) {
          if (!materialPrices[materialName]) {
            materialPrices[materialName] = { prices: [], suppliers: [], dates: [] };
          }
          materialPrices[materialName].prices.push(unitCost);
          materialPrices[materialName].suppliers.push(supplier);
          materialPrices[materialName].dates.push(m.material.date);
        }
      }

      // Build context for AI
      const totalMaterials = userMaterials.length;
      const totalSpent = userMaterials.reduce((sum, m) => sum + parseFloat(m.material.totalCost || "0"), 0);
      const supplierList = Object.entries(supplierStats)
        .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
        .map(([name, stats]) => `${name}: €${stats.totalSpent.toFixed(2)} spent on ${stats.itemCount} purchases`)
        .join("\n");

      const priceComparisons = Object.entries(materialPrices)
        .filter(([_, data]) => data.prices.length > 1)
        .map(([name, data]) => {
          const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
          const minPrice = Math.min(...data.prices);
          const maxPrice = Math.max(...data.prices);
          const cheapestIdx = data.prices.indexOf(minPrice);
          return `${name}: avg €${avgPrice.toFixed(2)}/unit, range €${minPrice.toFixed(2)}-€${maxPrice.toFixed(2)}, cheapest from ${data.suppliers[cheapestIdx]}`;
        })
        .join("\n");

      const recentPurchases = userMaterials.slice(0, 10).map(m =>
        `${m.material.name}: ${m.material.quantity} ${m.material.unit} at €${m.material.unitCost}/unit from ${m.material.supplier || "Unknown"} on ${new Date(m.material.date).toLocaleDateString("en-IE")}${m.client ? ` (Job: ${m.client.name})` : ""}`
      ).join("\n");

      const systemPrompt = `You are a helpful materials intelligence assistant for an Irish trades business. You help users understand their materials spending, compare suppliers, and make smart purchasing decisions.

CONTEXT - User's Materials Data:
- Total materials tracked: ${totalMaterials}
- Total spent on materials: €${totalSpent.toFixed(2)}

SUPPLIERS (sorted by spending):
${supplierList || "No supplier data yet"}

PRICE COMPARISONS (materials with multiple purchases):
${priceComparisons || "Not enough data for price comparisons yet"}

RECENT PURCHASES:
${recentPurchases || "No recent purchases"}

GUIDELINES:
- Use Euro (€) currency formatting
- Reference specific data from the user's purchases when answering
- Provide actionable insights about saving money
- If asked about price trends, analyze the historical data available
- Be concise but helpful
- If asked about something not in the data, say you don't have that information yet`;

      // Build conversation messages for Claude
      const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          claudeMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        }
      }

      // Add current message
      claudeMessages.push({ role: "user", content: message });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: claudeMessages,
      });

      const contentBlock = response.content[0];
      const aiResponse = contentBlock?.type === "text" ? contentBlock.text : "I'm sorry, I couldn't process that request. Please try again.";
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Materials AI chat error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // Quotr AI Assistant - unified business intelligence chat with tool calling
  app.post("/api/assistant/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const userId = req.session.userId!;
      const organizationId = req.session.organizationId;

      const accessConditionInvoices = organizationId
        ? eq(invoices.organizationId, organizationId)
        : eq(invoices.userId, userId);

      const accessConditionExpenses = organizationId
        ? eq(expenses.organizationId, organizationId)
        : eq(expenses.userId, userId);

      const accessConditionMaterials = organizationId
        ? eq(materials.organizationId, organizationId)
        : eq(materials.userId, userId);

      const accessConditionClients = organizationId
        ? eq(clients.organizationId, organizationId)
        : eq(clients.userId, userId);

      const accessConditionQuotes = organizationId
        ? eq(quotes.organizationId, organizationId)
        : eq(quotes.userId, userId);

      const accessConditionSavedItems = organizationId
        ? eq(savedItems.organizationId, organizationId)
        : eq(savedItems.userId, userId);

      // Fetch business data for context with proper organization scoping
      const [userInvoices, userClients, userExpenses, userMaterials, userQuotes, userItems, userActivities] = await Promise.all([
        db.select().from(invoices).where(accessConditionInvoices).orderBy(desc(invoices.date)).limit(50),
        db.select().from(clients).where(accessConditionClients),
        db.select().from(expenses).where(accessConditionExpenses).orderBy(desc(expenses.date)).limit(50),
        db.select().from(materials).where(accessConditionMaterials).orderBy(desc(materials.date)).limit(50),
        db.select().from(quotes).where(accessConditionQuotes).orderBy(desc(quotes.date)).limit(20),
        db.select().from(savedItems).where(accessConditionSavedItems),
        db.select().from(activityLogs).where(
          organizationId
            ? eq(activityLogs.organizationId, organizationId)
            : eq(activityLogs.userId, userId)
        ).orderBy(desc(activityLogs.createdAt)).limit(100),
      ]);

      // Calculate business metrics
      const totalRevenue = userInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);
      const outstandingAmount = userInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);
      const overdueCount = userInvoices.filter(i => i.status === 'overdue').length;
      const totalExpenses = userExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
      const totalMaterialsSpent = userMaterials.reduce((sum, m) => sum + parseFloat(m.totalCost || '0'), 0);

      // Build detailed client list with IDs
      const clientsList = userClients.map(c =>
        `- ${c.name} (ID: ${c.id})${c.email ? `, ${c.email}` : ''}${c.eircode ? `, ${c.eircode}` : ''}`
      ).join("\n");

      // Recent invoices with IDs
      const recentInvoices = userInvoices.slice(0, 15).map(i =>
        `- ${i.invoiceNumber} (ID: ${i.id}): €${parseFloat(i.total || '0').toFixed(2)} for ${userClients.find(c => c.id === i.clientId)?.name || 'Unknown'} (${i.status})`
      ).join("\n");

      // Recent quotes with IDs
      const recentQuotes = userQuotes.slice(0, 10).map(q =>
        `- ${q.quoteNumber} (ID: ${q.id}): €${parseFloat(q.total || '0').toFixed(2)} for ${userClients.find(c => c.id === q.clientId)?.name || 'Unknown'} (${q.status})`
      ).join("\n");

      // Saved items/services for quote generation
      const itemsList = userItems.map(item =>
        `- ${item.name} (ID: ${item.id}): €${parseFloat(item.rate || '0').toFixed(2)}/${item.unit} (${(parseFloat(item.vatRate || '0') * 100).toFixed(0)}% VAT)`
      ).join("\n");

      // Materials data for cost advice
      const materialsList = userMaterials.slice(0, 20).map(m =>
        `- ${m.name}: ${m.quantity} ${m.unit} @ €${parseFloat(m.unitCost || '0').toFixed(2)} from ${m.supplier || 'unknown'}`
      ).join("\n");

      // Recent activities for workflow insights
      const activitiesSummary = userActivities.slice(0, 20).map(a =>
        `- ${new Date(a.createdAt).toLocaleString('en-IE')}: ${a.action} ${a.entityType ? `on ${a.entityType}` : ''}`
      ).join("\n");

      // Define tools for agentic capabilities
      const tools: Anthropic.Tool[] = [
        {
          name: "search_clients",
          description: "Search for clients by name, email, or eircode. Use this when the user mentions a client name to find their ID.",
          input_schema: {
            type: "object" as const,
            properties: {
              query: { type: "string", description: "Search term (name, email, or eircode)" }
            },
            required: ["query"]
          }
        },
        {
          name: "get_client_details",
          description: "Get full details about a specific client including their invoice and quote history.",
          input_schema: {
            type: "object" as const,
            properties: {
              client_id: { type: "number", description: "The client's ID" }
            },
            required: ["client_id"]
          }
        },
        {
          name: "get_invoice_details",
          description: "Get full details of an invoice including all line items. Use this to reference previous work for a client.",
          input_schema: {
            type: "object" as const,
            properties: {
              invoice_id: { type: "number", description: "The invoice ID" }
            },
            required: ["invoice_id"]
          }
        },
        {
          name: "create_client",
          description: "Create a new client. Use this when the user wants to add a new customer.",
          input_schema: {
            type: "object" as const,
            properties: {
              name: { type: "string", description: "Client's full name or business name" },
              email: { type: "string", description: "Client's email address (optional)" },
              phone: { type: "string", description: "Client's phone number (optional)" },
              address: { type: "string", description: "Client's address (optional)" },
              eircode: { type: "string", description: "Irish Eircode (optional)" }
            },
            required: ["name"]
          }
        },
        {
          name: "create_quote",
          description: "Create a new quote for a client with line items. Always confirm with the user before creating.",
          input_schema: {
            type: "object" as const,
            properties: {
              client_id: { type: "number", description: "The client's ID" },
              title: { type: "string", description: "Quote title/description" },
              valid_until: { type: "string", description: "Validity date in ISO format (optional, defaults to 30 days)" },
              line_items: {
                type: "array",
                description: "Array of line items",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string", description: "Line item description" },
                    quantity: { type: "number", description: "Quantity" },
                    unit: { type: "string", description: "Unit (e.g., 'hours', 'units', 'sqm')" },
                    rate: { type: "number", description: "Rate per unit in EUR" },
                    vat_rate: { type: "number", description: "VAT rate as decimal (0.23 for 23%, 0.135 for 13.5%, 0.09 for 9%, 0 for exempt)" }
                  },
                  required: ["description", "quantity", "rate"]
                }
              },
              notes: { type: "string", description: "Additional notes (optional)" }
            },
            required: ["client_id", "line_items"]
          }
        },
        {
          name: "update_quote_status",
          description: "Update the status of a quote (e.g., send to client, mark as accepted).",
          input_schema: {
            type: "object" as const,
            properties: {
              quote_id: { type: "number", description: "The quote ID" },
              status: { type: "string", enum: ["draft", "sent", "accepted", "rejected"], description: "New status" }
            },
            required: ["quote_id", "status"]
          }
        },
        {
          name: "convert_quote_to_invoice",
          description: "Convert an accepted quote into an invoice.",
          input_schema: {
            type: "object" as const,
            properties: {
              quote_id: { type: "number", description: "The quote ID to convert" }
            },
            required: ["quote_id"]
          }
        }
      ];

      // Tool execution function
      const executeTool = async (toolName: string, toolInput: any): Promise<string> => {
        try {
          switch (toolName) {
            case "search_clients": {
              const query = toolInput.query.toLowerCase();
              const matches = userClients.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.email?.toLowerCase().includes(query) ||
                c.eircode?.toLowerCase().includes(query)
              );
              if (matches.length === 0) return "No clients found matching that search.";
              return `Found ${matches.length} client(s):\n` + matches.map(c =>
                `- ${c.name} (ID: ${c.id})${c.email ? `, Email: ${c.email}` : ''}${c.phone ? `, Phone: ${c.phone}` : ''}${c.eircode ? `, Eircode: ${c.eircode}` : ''}`
              ).join("\n");
            }

            case "get_client_details": {
              const client = userClients.find(c => c.id === toolInput.client_id);
              if (!client) return "Client not found.";

              const clientInvoices = userInvoices.filter(i => i.clientId === client.id);
              const clientQuotes = userQuotes.filter(q => q.clientId === client.id);
              const totalBilled = clientInvoices.reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);
              const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);

              return `CLIENT: ${client.name} (ID: ${client.id})
Email: ${client.email || 'Not set'}
Phone: ${client.phone || 'Not set'}
Address: ${client.address || 'Not set'}
Eircode: ${client.eircode || 'Not set'}

HISTORY:
- Total Invoices: ${clientInvoices.length} (€${totalBilled.toFixed(2)} billed, €${totalPaid.toFixed(2)} paid)
- Total Quotes: ${clientQuotes.length}

RECENT INVOICES:
${clientInvoices.slice(0, 5).map(i => `- ${i.invoiceNumber}: €${parseFloat(i.total || '0').toFixed(2)} (${i.status})`).join("\n") || "None"}

RECENT QUOTES:
${clientQuotes.slice(0, 5).map(q => `- ${q.quoteNumber}: €${parseFloat(q.total || '0').toFixed(2)} (${q.status})`).join("\n") || "None"}`;
            }

            case "get_invoice_details": {
              const invoice = userInvoices.find(i => i.id === toolInput.invoice_id);
              if (!invoice) return "Invoice not found.";

              const invoiceLineItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
              const client = userClients.find(c => c.id === invoice.clientId);

              return `INVOICE: ${invoice.invoiceNumber} (ID: ${invoice.id})
Client: ${client?.name || 'Unknown'}
Date: ${invoice.date ? new Date(invoice.date).toLocaleDateString('en-IE') : 'N/A'}
Status: ${invoice.status}
Total: €${parseFloat(invoice.total || '0').toFixed(2)}

LINE ITEMS:
${invoiceLineItems.map((item: any) => `- ${item.description}: ${item.quantity} x €${parseFloat(item.rate || '0').toFixed(2)} = €${parseFloat(item.amount || '0').toFixed(2)}`).join("\n") || "No items"}

Notes: ${invoice.notes || 'None'}`;
            }

            case "create_client": {
              const [newClient] = await db.insert(clients).values({
                userId,
                organizationId: organizationId || null,
                name: toolInput.name,
                email: toolInput.email || null,
                phone: toolInput.phone || null,
                address: toolInput.address || null,
                eircode: toolInput.eircode || null,
              }).returning();

              return `Created new client: ${newClient.name} (ID: ${newClient.id})`;
            }

            case "create_quote": {
              const client = userClients.find(c => c.id === toolInput.client_id);
              if (!client) return "Error: Client not found. Please search for the client first.";

              const lineItems = toolInput.line_items || [];
              let subtotal = 0;
              let vatTotal = 0;

              for (const item of lineItems) {
                const amount = (item.quantity || 1) * (item.rate || 0);
                const vatRate = item.vat_rate ?? 0.23;
                subtotal += amount;
                vatTotal += amount * vatRate;
              }

              const total = subtotal + vatTotal;
              const validUntil = toolInput.valid_until ? new Date(toolInput.valid_until) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              // Generate quote number
              const quoteCount = await db.select({ count: sql<number>`count(*)` }).from(quotes).where(accessConditionQuotes);
              const quoteNumber = `QUO-${new Date().getFullYear()}-${String((quoteCount[0]?.count || 0) + 1).padStart(4, '0')}`;

              const [newQuote] = await db.insert(quotes).values({
                userId,
                organizationId: organizationId || null,
                clientId: client.id,
                quoteNumber,
                date: new Date(),
                validUntil,
                subtotal: subtotal.toFixed(2),
                vatAmount: vatTotal.toFixed(2),
                total: total.toFixed(2),
                status: "draft",
                notes: toolInput.notes || null,
              }).returning();

              // Insert line items
              if (lineItems.length > 0) {
                await db.insert(quoteItems).values(
                  lineItems.map((item: any) => ({
                    quoteId: newQuote.id,
                    description: item.description,
                    quantity: String(item.quantity || 1),
                    rate: String(item.rate || 0),
                    amount: String((item.quantity || 1) * (item.rate || 0)),
                  }))
                );
              }

              return `Created quote ${quoteNumber} (ID: ${newQuote.id}) for ${client.name}
Total: €${total.toFixed(2)} (€${subtotal.toFixed(2)} + €${vatTotal.toFixed(2)} VAT)
Status: Draft
Line Items: ${lineItems.length}

The quote is ready for review. Would you like me to send it to the client?`;
            }

            case "update_quote_status": {
              const quote = userQuotes.find(q => q.id === toolInput.quote_id);
              if (!quote) return "Quote not found.";

              await db.update(quotes)
                .set({ status: toolInput.status, updatedAt: new Date() })
                .where(eq(quotes.id, toolInput.quote_id));

              return `Updated quote ${quote.quoteNumber} status to: ${toolInput.status}`;
            }

            case "convert_quote_to_invoice": {
              const quote = userQuotes.find(q => q.id === toolInput.quote_id);
              if (!quote) return "Quote not found.";
              if (quote.status !== 'accepted') return "Quote must be accepted before converting to invoice.";

              const quoteItemsList = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quote.id));

              // Generate invoice number
              const invoiceCount = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(accessConditionInvoices);
              const invoiceNumber = `INV-${new Date().getFullYear()}-${String((invoiceCount[0]?.count || 0) + 1).padStart(4, '0')}`;

              const [newInvoice] = await db.insert(invoices).values({
                userId,
                organizationId: organizationId || null,
                clientId: quote.clientId,
                invoiceNumber,
                date: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal: quote.subtotal,
                vatAmount: quote.vatAmount,
                total: quote.total,
                status: "draft",
                notes: quote.notes,
              }).returning();

              // Copy line items
              if (quoteItemsList.length > 0) {
                await db.insert(invoiceItems).values(
                  quoteItemsList.map((item) => ({
                    invoiceId: newInvoice.id,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                  }))
                );
              }

              // Mark quote as converted
              await db.update(quotes)
                .set({ status: "converted", updatedAt: new Date() })
                .where(eq(quotes.id, quote.id));

              const client = userClients.find(c => c.id === quote.clientId);
              return `Converted quote ${quote.quoteNumber} to invoice ${invoiceNumber} (ID: ${newInvoice.id})
Client: ${client?.name || 'Unknown'}
Total: €${parseFloat(newInvoice.total || '0').toFixed(2)}
Status: Draft (ready to send)`;
            }

            default:
              return `Unknown tool: ${toolName}`;
          }
        } catch (error) {
          console.error(`Tool execution error (${toolName}):`, error);
          return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      };

      const systemPrompt = `You are Quotr Assistant, an AI business helper for Irish tradespeople and service businesses.

## YOUR IDENTITY
- Name: Quotr Assistant
- Role: Trusted business partner for invoicing, quoting, and financial insights
- Personality: Professional, concise, action-oriented, friendly
- Expertise: Irish VAT regulations, trade pricing, business analytics

## YOUR CAPABILITIES (Tools Available)
You have access to tools that let you actually CREATE and MANAGE data:
- search_clients: Find clients by name/email/eircode
- get_client_details: Get full client history
- get_invoice_details: Get invoice line items (useful for creating similar quotes)
- create_client: Add new clients
- create_quote: Create quotes with line items
- update_quote_status: Send quotes or mark as accepted/rejected
- convert_quote_to_invoice: Turn accepted quotes into invoices

## WORKFLOW GUIDANCE
When the user asks to create a quote:
1. First, search for or identify the client
2. If referencing previous work, get the invoice details
3. Propose the line items and get confirmation
4. Only then create the quote

When creating quotes:
- Default VAT rate is 23% (0.23)
- Construction/renovation services: 13.5% (0.135)
- Always itemize labor and materials separately when possible

## CURRENT BUSINESS DATA
- Total Revenue (paid): €${totalRevenue.toFixed(2)}
- Outstanding: €${outstandingAmount.toFixed(2)} (${overdueCount} overdue)
- Expenses: €${totalExpenses.toFixed(2)}
- Materials: €${totalMaterialsSpent.toFixed(2)}
- Clients: ${userClients.length}
- Quotes: ${userQuotes.length}
- Invoices: ${userInvoices.length}

## CLIENTS
${clientsList || "No clients yet"}

## RECENT INVOICES
${recentInvoices || "No invoices yet"}

## RECENT QUOTES
${recentQuotes || "No quotes yet"}

## SAVED SERVICES/PRODUCTS
${itemsList || "No saved items yet"}

## RECENT MATERIALS
${materialsList || "No materials logged yet"}

## RECENT ACTIVITY
${activitiesSummary || "No activity yet"}

## RULES & BOUNDARIES
1. ALWAYS confirm before creating/modifying data
2. NEVER delete anything
3. NEVER provide financial/tax advice - suggest consulting an accountant
4. Use Euro (€) and Irish date format (DD/MM/YYYY)
5. Be concise - tradespeople are busy
6. When uncertain, ask clarifying questions
7. Reference specific data when available

## SAFETY
- You cannot access payment processing
- You cannot delete clients, invoices, or quotes
- You cannot modify paid invoices`;

      // Build conversation messages for Claude
      const claudeMessages: Anthropic.MessageParam[] = [];

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          claudeMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        }
      }

      // Add current message
      claudeMessages.push({ role: "user", content: message });

      // Initial API call with tools
      let response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: claudeMessages,
        tools,
      });

      // Handle tool use loop
      const toolResults: string[] = [];
      while (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        const toolResultsContent: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          const result = await executeTool(toolUse.name, toolUse.input);
          toolResults.push(`[${toolUse.name}]: ${result}`);
          toolResultsContent.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Continue conversation with tool results
        claudeMessages.push({ role: "assistant", content: response.content });
        claudeMessages.push({ role: "user", content: toolResultsContent });

        response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 8192,
          system: systemPrompt,
          messages: claudeMessages,
          tools,
        });
      }

      // Extract final text response
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const aiResponse = textBlock?.text || "I'm sorry, I couldn't process that request. Please try again.";

      // Include tool actions in response metadata
      res.json({
        response: aiResponse,
        actions: toolResults.length > 0 ? toolResults : undefined
      });
    } catch (error) {
      console.error("AI Assistant chat error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // AI Assistant voice transcription endpoint
  app.post("/api/assistant/transcribe", requireAuth, upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const audioBuffer = req.file.buffer;
      const base64Audio = audioBuffer.toString("base64");
      const mimeType = req.file.mimetype || "audio/mp4";

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio,
                },
              },
              { text: "Please transcribe this audio accurately. Only return the transcription text, nothing else. If the audio is unclear or empty, respond with an empty string." },
            ],
          },
        ],
      });

      const transcription = result.text?.trim() || "";
      res.json({ text: transcription });
    } catch (error) {
      console.error("Audio transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Materials supplier analytics endpoint
  app.get("/api/materials/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const userMaterials = await db.select().from(materials).where(accessCondition);

      // Supplier breakdown
      const supplierBreakdown: Record<string, { totalSpent: number; itemCount: number; avgCost: number }> = {};
      // Material price comparison across suppliers
      const materialBySupplier: Record<string, Record<string, { avgPrice: number; count: number; lastPrice: number; lastDate: Date }>> = {};

      for (const m of userMaterials) {
        const supplier = m.supplier || "Unknown";
        const materialName = m.name.toLowerCase().trim();
        const unitCost = parseFloat(m.unitCost || "0");
        const totalCost = parseFloat(m.totalCost || "0");

        // Supplier totals
        if (!supplierBreakdown[supplier]) {
          supplierBreakdown[supplier] = { totalSpent: 0, itemCount: 0, avgCost: 0 };
        }
        supplierBreakdown[supplier].totalSpent += totalCost;
        supplierBreakdown[supplier].itemCount += 1;

        // Material prices by supplier
        if (unitCost > 0) {
          if (!materialBySupplier[materialName]) {
            materialBySupplier[materialName] = {};
          }
          if (!materialBySupplier[materialName][supplier]) {
            materialBySupplier[materialName][supplier] = { avgPrice: 0, count: 0, lastPrice: 0, lastDate: new Date(0) };
          }
          const existing = materialBySupplier[materialName][supplier];
          existing.avgPrice = ((existing.avgPrice * existing.count) + unitCost) / (existing.count + 1);
          existing.count += 1;
          if (m.date > existing.lastDate) {
            existing.lastPrice = unitCost;
            existing.lastDate = m.date;
          }
        }
      }

      // Calculate averages
      for (const supplier of Object.keys(supplierBreakdown)) {
        const stats = supplierBreakdown[supplier];
        stats.avgCost = stats.totalSpent / stats.itemCount;
      }

      // Find materials with price variations
      const priceComparisons = Object.entries(materialBySupplier)
        .filter(([_, suppliers]) => Object.keys(suppliers).length > 1)
        .map(([material, suppliers]) => {
          const supplierPrices = Object.entries(suppliers).map(([name, data]) => ({
            supplier: name,
            avgPrice: data.avgPrice,
            lastPrice: data.lastPrice,
            count: data.count,
          }));
          const cheapest = supplierPrices.reduce((a, b) => a.avgPrice < b.avgPrice ? a : b);
          const mostExpensive = supplierPrices.reduce((a, b) => a.avgPrice > b.avgPrice ? a : b);
          const savingsPercent = ((mostExpensive.avgPrice - cheapest.avgPrice) / mostExpensive.avgPrice * 100).toFixed(1);
          return {
            material,
            suppliers: supplierPrices,
            cheapest: cheapest.supplier,
            savingsPercent,
          };
        })
        .sort((a, b) => parseFloat(b.savingsPercent) - parseFloat(a.savingsPercent));

      res.json({
        supplierBreakdown: Object.entries(supplierBreakdown)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.totalSpent - a.totalSpent),
        priceComparisons,
        totalMaterials: userMaterials.length,
        totalSpent: userMaterials.reduce((sum, m) => sum + parseFloat(m.totalCost || "0"), 0),
      });
    } catch (error) {
      console.error("Materials analytics error:", error);
      res.status(500).json({ error: "Failed to get materials analytics" });
    }
  });

  app.get("/api/invoices", requireAuth, async (req: Request, res: Response) => {
    try {
      const selectedYear = parseInt(req.query.year as string) || null;
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
      const offset = parseInt(req.query.offset as string) || 0;

      const accessCondition = req.session.organizationId
        ? eq(invoices.organizationId, req.session.organizationId)
        : eq(invoices.userId, req.session.userId!);

      let conditions = [accessCondition];

      if (selectedYear) {
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        conditions.push(gte(invoices.date, startOfYear));
        conditions.push(lte(invoices.date, endOfYear));
      }

      const result = await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(and(...conditions)).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset);
      res.json(result.map(r => ({ ...r.invoice, client: r.client })));
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ error: "Failed to get invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, invoiceNumber, date, dueDate, vatRate, discount, notes, paymentInfo, poNumber, status, items, paymentDetails } = req.body;
      let subtotal = 0;
      for (const item of items || []) {
        subtotal += parseFloat(item.quantity) * parseFloat(item.rate);
      }
      const discountAmount = parseFloat(discount) || 0;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const vatAmount = taxableAmount * parseFloat(vatRate || 0.23);
      const total = taxableAmount + vatAmount;

      // Auto-generate invoice number if not provided
      let finalInvoiceNumber = invoiceNumber;
      if (!finalInvoiceNumber) {
        const [lastInvoice] = await db.select({ invoiceNumber: invoices.invoiceNumber })
          .from(invoices)
          .where(eq(invoices.userId, req.session.userId!))
          .orderBy(desc(invoices.createdAt))
          .limit(1);

        const currentYear = new Date().getFullYear();
        if (lastInvoice && lastInvoice.invoiceNumber) {
          const match = lastInvoice.invoiceNumber.match(/INV-(\d+)-(\d+)/);
          if (match && parseInt(match[1]) === currentYear) {
            finalInvoiceNumber = `INV-${currentYear}-${String(parseInt(match[2]) + 1).padStart(4, '0')}`;
          } else {
            finalInvoiceNumber = `INV-${currentYear}-0001`;
          }
        } else {
          finalInvoiceNumber = `INV-${currentYear}-0001`;
        }
      }

      const [invoice] = await db.insert(invoices).values({
        userId: req.session.userId!,
        clientId,
        invoiceNumber: finalInvoiceNumber,
        date: new Date(date),
        dueDate: new Date(dueDate),
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        vatRate: vatRate || "0.23",
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        taxable: taxableAmount.toFixed(2),
        paidAmount: status === "paid" ? total.toFixed(2) : "0",
        notes,
        paymentInfo,
        poNumber: poNumber || null,
        status: status || "draft",
        paidDate: status === "paid" ? new Date() : null,
        paymentDetails: paymentDetails || null,
        organizationId: req.session.organizationId,
      }).returning();

      if (items && items.length > 0) {
        for (const item of items) {
          const amount = parseFloat(item.quantity) * parseFloat(item.rate);
          await db.insert(invoiceItems).values({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: amount.toFixed(2),
          });
        }
      }

      // Log activity
      await logActivity(req, "create_invoice", "invoice", invoice.id, { invoiceNumber: finalInvoiceNumber, total });

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [result] = await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(and(eq(invoices.id, parseInt(req.params.id)), eq(invoices.userId, req.session.userId!))).limit(1);
      if (!result) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, result.invoice.id));
      res.json({ ...result.invoice, client: result.client, items });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, invoiceNumber, date, dueDate, vatRate, discount, notes, paymentInfo, poNumber, items, status, paidDate, paidAmount, paymentDetails } = req.body;
      let subtotal = 0;
      for (const item of items || []) {
        subtotal += parseFloat(item.quantity) * parseFloat(item.rate);
      }
      const discountAmount = parseFloat(discount) || 0;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const vatAmount = taxableAmount * parseFloat(vatRate || 0.23);
      const total = taxableAmount + vatAmount;

      const [invoice] = await db.update(invoices).set({
        clientId,
        invoiceNumber,
        date: new Date(date),
        dueDate: new Date(dueDate),
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        vatRate: vatRate || "0.23",
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        taxable: taxableAmount.toFixed(2),
        paidAmount: paidAmount !== undefined ? parseFloat(paidAmount).toFixed(2) : (status === "paid" ? total.toFixed(2) : undefined),
        notes,
        paymentInfo,
        poNumber: poNumber || null,
        status,
        paidDate: paidDate ? new Date(paidDate) : (status === "paid" ? new Date() : null),
        paymentDetails: paymentDetails || null,
        updatedAt: new Date(),
      }).where(and(eq(invoices.id, parseInt(req.params.id)), eq(invoices.userId, req.session.userId!))).returning();

      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
      if (items && items.length > 0) {
        for (const item of items) {
          const amount = parseFloat(item.quantity) * parseFloat(item.rate);
          await db.insert(invoiceItems).values({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: amount.toFixed(2),
          });
        }
      }

      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.put("/api/invoices/:id/status", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { status, paidDate, paymentMethod } = req.body;

      // If marking as paid, we need to get the invoice total first
      let paidAmount: string | undefined = undefined;
      if (status === "paid") {
        const [existingInvoice] = await db.select().from(invoices)
          .where(and(eq(invoices.id, parseInt(req.params.id)), eq(invoices.userId, req.session.userId!)));
        if (existingInvoice) {
          paidAmount = existingInvoice.total;
        }
      }

      const [invoice] = await db.update(invoices).set({
        status,
        paidDate: paidDate ? new Date(paidDate) : (status === "paid" ? new Date() : null),
        paidAmount: paidAmount,
        paymentMethod: status === "paid" ? (paymentMethod || "Bank") : null,
        updatedAt: new Date(),
      }).where(and(eq(invoices.id, parseInt(req.params.id)), eq(invoices.userId, req.session.userId!))).returning();
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice status error:", error);
      res.status(500).json({ error: "Failed to update invoice status" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, parseInt(req.params.id)));
      await db.delete(invoices).where(and(eq(invoices.id, parseInt(req.params.id)), eq(invoices.userId, req.session.userId!)));
      res.status(204).send();
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  app.post("/api/invoices/:id/cash-payment", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { amount, notes } = req.body;

      const [invoice] = await db.select().from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, req.session.userId!)));

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!));
      const receiverName = user?.name || user?.email || "Unknown";

      const paymentAmount = amount || invoice.total;
      const now = new Date();

      const [cashPayment] = await db.insert(cashPayments).values({
        invoiceId,
        organizationId: invoice.organizationId,
        amount: paymentAmount,
        receivedById: req.session.userId!,
        receivedByName: receiverName,
        receivedAt: now,
        notes: notes || null,
      }).returning();

      await db.update(invoices).set({
        status: "paid",
        paidDate: now,
        paidAmount: paymentAmount,
        paymentMethod: "Cash",
        paymentDetails: notes || "Cash payment recorded",
        updatedAt: now,
      }).where(eq(invoices.id, invoiceId));

      res.json(cashPayment);
    } catch (error) {
      console.error("Record cash payment error:", error);
      res.status(500).json({ error: "Failed to record cash payment" });
    }
  });

  app.get("/api/invoices/:id/cash-payments", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);

      const payments = await db.select().from(cashPayments)
        .where(eq(cashPayments.invoiceId, invoiceId))
        .orderBy(desc(cashPayments.receivedAt));

      res.json(payments);
    } catch (error) {
      console.error("Get cash payments error:", error);
      res.status(500).json({ error: "Failed to get cash payments" });
    }
  });

  app.get("/api/cash-payments", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      let conditions = [eq(cashPayments.organizationId, req.organizationId!)];

      if (startDate) {
        conditions.push(gte(cashPayments.receivedAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(cashPayments.receivedAt, new Date(endDate as string)));
      }

      const payments = await db.select({
        cashPayment: cashPayments,
        invoice: {
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientId: invoices.clientId,
          total: invoices.total,
        },
      }).from(cashPayments)
        .leftJoin(invoices, eq(cashPayments.invoiceId, invoices.id))
        .where(and(...conditions))
        .orderBy(desc(cashPayments.receivedAt));

      res.json(payments);
    } catch (error) {
      console.error("Get all cash payments error:", error);
      res.status(500).json({ error: "Failed to get cash payments" });
    }
  });

  app.get("/api/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const selectedYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const now = new Date();
      const isCurrentYear = selectedYear === now.getFullYear();

      const startOfSelectedYear = new Date(selectedYear, 0, 1);
      startOfSelectedYear.setHours(0, 0, 0, 0);
      const endOfSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

      const startOfThisWeek = new Date(isCurrentYear ? now : endOfSelectedYear);
      startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
      startOfThisWeek.setHours(0, 0, 0, 0);
      if (!isCurrentYear && startOfThisWeek > endOfSelectedYear) {
        startOfThisWeek.setTime(new Date(selectedYear, 11, 25).getTime());
      }

      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);

      const endOfThisWeek = new Date(startOfThisWeek);
      endOfThisWeek.setDate(endOfThisWeek.getDate() + 6);
      endOfThisWeek.setHours(23, 59, 59, 999);

      const startOfYear = new Date(selectedYear, 0, 1);
      startOfYear.setHours(0, 0, 0, 0);

      const referenceDate = isCurrentYear ? now : endOfSelectedYear;
      const startOfMonth = new Date(selectedYear, referenceDate.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisWeekInvoices = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), eq(invoices.status, "paid"), gte(invoices.paidDate, startOfThisWeek), lte(invoices.paidDate, endOfSelectedYear)));
      const lastWeekInvoices = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), eq(invoices.status, "paid"), gte(invoices.paidDate, startOfLastWeek), lte(invoices.paidDate, endOfLastWeek)));

      const thisWeekExpenses = await db.select().from(expenses).where(and(eq(expenses.userId, req.session.userId!), gte(expenses.date, startOfThisWeek), lte(expenses.date, endOfSelectedYear)));
      const lastWeekExpenses = await db.select().from(expenses).where(and(eq(expenses.userId, req.session.userId!), gte(expenses.date, startOfLastWeek), lte(expenses.date, endOfLastWeek)));

      // YTD by paid date (cash received)
      const ytdPaidInvoices = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), eq(invoices.status, "paid"), gte(invoices.paidDate, startOfYear), lte(invoices.paidDate, endOfSelectedYear)));
      const ytdExpenses = await db.select().from(expenses).where(and(eq(expenses.userId, req.session.userId!), gte(expenses.date, startOfYear), lte(expenses.date, endOfSelectedYear)));

      // YTD by invoice date (invoiced/billed)
      const ytdInvoicedByDate = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), gte(invoices.date, startOfYear), lte(invoices.date, endOfSelectedYear)));

      const endOfSelectedMonth = new Date(selectedYear, referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
      // Monthly by paid date (cash received)
      const monthlyPaidInvoices = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), eq(invoices.status, "paid"), gte(invoices.paidDate, startOfMonth), lte(invoices.paidDate, endOfSelectedMonth)));
      const monthlyExpenses = await db.select().from(expenses).where(and(eq(expenses.userId, req.session.userId!), gte(expenses.date, startOfMonth), lte(expenses.date, endOfSelectedMonth)));

      // Monthly by invoice date (invoiced/billed)
      const monthlyInvoicedByDate = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), gte(invoices.date, startOfMonth), lte(invoices.date, endOfSelectedMonth)));

      const allUserInvoices = await db.select().from(invoices).where(and(eq(invoices.userId, req.session.userId!), gte(invoices.date, startOfSelectedYear), lte(invoices.date, endOfSelectedYear)));

      // Get unique client IDs who have invoices in the selected year (active clients for that year)
      const clientIdsInYear = new Set(allUserInvoices.map(inv => inv.clientId).filter(id => id != null));
      const activeClientsCount = clientIdsInYear.size;

      const thisWeekRevenue = thisWeekInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const lastWeekRevenue = lastWeekInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const thisWeekExpenseTotal = thisWeekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const lastWeekExpenseTotal = lastWeekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

      // Cash received (by paid date)
      const ytdRevenue = ytdPaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const ytdExpenseTotal = ytdExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

      // Invoiced (by invoice date)
      const ytdInvoiced = ytdInvoicedByDate.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

      // Cash received (by paid date)
      const monthlyRevenue = monthlyPaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const monthlyExpenseTotal = monthlyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

      // Invoiced (by invoice date)
      const monthlyInvoiced = monthlyInvoicedByDate.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

      const unpaidInvoices = allUserInvoices.filter(inv => inv.status === "sent" || inv.status === "overdue");
      const days30Ago = new Date(now);
      days30Ago.setDate(days30Ago.getDate() - 30);
      const days60Ago = new Date(now);
      days60Ago.setDate(days60Ago.getDate() - 60);
      const days90Ago = new Date(now);
      days90Ago.setDate(days90Ago.getDate() - 90);

      let agingCurrent = 0;
      let agingDays30 = 0;
      let agingDays60 = 0;
      let agingDays90Plus = 0;

      for (const inv of unpaidInvoices) {
        const dueDate = new Date(inv.dueDate);
        const total = parseFloat(inv.total);
        if (dueDate >= days30Ago) {
          agingCurrent += total;
        } else if (dueDate >= days60Ago) {
          agingDays30 += total;
        } else if (dueDate >= days90Ago) {
          agingDays60 += total;
        } else {
          agingDays90Plus += total;
        }
      }

      const totalInvoicesValue = allUserInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const averageInvoiceValue = allUserInvoices.length > 0 ? totalInvoicesValue / allUserInvoices.length : 0;

      const outstandingInvoices = await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(and(eq(invoices.userId, req.session.userId!), sql`${invoices.status} IN ('sent', 'overdue')`, gte(invoices.date, startOfSelectedYear), lte(invoices.date, endOfSelectedYear))).orderBy(invoices.dueDate);

      const recentInvoices = await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(and(eq(invoices.userId, req.session.userId!), gte(invoices.date, startOfSelectedYear), lte(invoices.date, endOfSelectedYear))).orderBy(desc(invoices.createdAt)).limit(3);

      const recentExpenses = await db.select().from(expenses).where(and(eq(expenses.userId, req.session.userId!), gte(expenses.date, startOfSelectedYear), lte(expenses.date, endOfSelectedYear))).orderBy(desc(expenses.date)).limit(3);

      const allQuotes = await db.select().from(quotes).where(and(eq(quotes.userId, req.session.userId!), gte(quotes.date, startOfSelectedYear), lte(quotes.date, endOfSelectedYear)));
      const openQuotes = allQuotes.filter(q => q.status === "open" || q.status === "draft" || q.status === "sent");
      const openQuotesTotal = openQuotes.reduce((sum, q) => sum + parseFloat(q.total), 0);

      const overdueCount = outstandingInvoices.filter(i => {
        const dueDate = new Date(i.invoice.dueDate);
        return dueDate < now && i.invoice.status !== "paid";
      }).length;

      // Variation orders stats
      const organizationId = req.session.organizationId;
      let variationStats = { pending: 0, approved: 0, invoiced: 0, totalValue: 0, pendingValue: 0 };
      if (organizationId) {
        const allVariations = await db.select().from(variationOrders)
          .where(and(
            eq(variationOrders.organizationId, organizationId),
            gte(variationOrders.date, startOfSelectedYear),
            lte(variationOrders.date, endOfSelectedYear)
          ));
        variationStats = {
          pending: allVariations.filter(v => v.status === "pending_approval").length,
          approved: allVariations.filter(v => v.status === "approved").length,
          invoiced: allVariations.filter(v => v.status === "invoiced").length,
          totalValue: allVariations.reduce((sum, v) => sum + parseFloat(v.total), 0),
          pendingValue: allVariations.filter(v => v.status === "pending_approval" || v.status === "approved")
            .reduce((sum, v) => sum + parseFloat(v.total), 0),
        };
      }

      // Cash payments stats
      const ytdCashPayments = await db.select().from(cashPayments)
        .where(and(
          eq(cashPayments.organizationId, organizationId!),
          gte(cashPayments.receivedAt, startOfYear),
          lte(cashPayments.receivedAt, endOfSelectedYear)
        ));

      const monthlyCashPayments = await db.select().from(cashPayments)
        .where(and(
          eq(cashPayments.organizationId, organizationId!),
          gte(cashPayments.receivedAt, startOfMonth),
          lte(cashPayments.receivedAt, endOfSelectedMonth)
        ));

      const thisWeekCashPayments = await db.select().from(cashPayments)
        .where(and(
          eq(cashPayments.organizationId, organizationId!),
          gte(cashPayments.receivedAt, startOfThisWeek),
          lte(cashPayments.receivedAt, endOfThisWeek)
        ));

      const recentCashPayments = await db.select({
        cashPayment: cashPayments,
        invoice: {
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientId: invoices.clientId,
        },
      }).from(cashPayments)
        .leftJoin(invoices, eq(cashPayments.invoiceId, invoices.id))
        .where(and(
          eq(cashPayments.organizationId, organizationId!),
          gte(cashPayments.receivedAt, startOfSelectedYear)
        ))
        .orderBy(desc(cashPayments.receivedAt))
        .limit(5);

      const cashStats = {
        ytdTotal: ytdCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        ytdCount: ytdCashPayments.length,
        monthlyTotal: monthlyCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        monthlyCount: monthlyCashPayments.length,
        thisWeekTotal: thisWeekCashPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        thisWeekCount: thisWeekCashPayments.length,
        recentPayments: recentCashPayments,
      };

      // Needs Attention data
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Quotes expiring soon (valid until date within 7 days)
      const expiringQuotes = organizationId ? await db.select({
        quote: quotes,
        client: clients,
      }).from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .where(and(
          eq(quotes.organizationId, organizationId),
          inArray(quotes.status, ["open", "sent"]),
          isNotNull(quotes.validUntil),
          lte(quotes.validUntil, sevenDaysFromNow),
          gte(quotes.validUntil, now)
        ))
        .orderBy(quotes.validUntil)
        .limit(5) : [];

      // Invoices going overdue soon (due within 7 days, not yet overdue)
      const upcomingOverdue = organizationId ? await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.status, "sent"),
          lte(invoices.dueDate, sevenDaysFromNow),
          gte(invoices.dueDate, now)
        ))
        .orderBy(invoices.dueDate)
        .limit(5) : [];

      // Time tracking summary for today/this week
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const todayTimeEntries = organizationId ? await db.select().from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, organizationId),
          gte(timeEntries.startTime, startOfToday)
        )) : [];

      const weekTimeEntries = organizationId ? await db.select().from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, organizationId),
          gte(timeEntries.startTime, startOfThisWeek),
          lte(timeEntries.startTime, endOfThisWeek)
        )) : [];

      const calculateTotalMinutes = (entries: any[]) => {
        return entries.reduce((total, entry) => {
          if (entry.startTime && entry.endTime) {
            const start = new Date(entry.startTime);
            const end = new Date(entry.endTime);
            const breakMins = entry.breakMinutes || 0;
            return total + Math.round((end.getTime() - start.getTime()) / 60000) - breakMins;
          }
          return total;
        }, 0);
      };

      const timeStats = {
        todayMinutes: calculateTotalMinutes(todayTimeEntries),
        weekMinutes: calculateTotalMinutes(weekTimeEntries),
        todayEntries: todayTimeEntries.length,
        weekEntries: weekTimeEntries.length,
      };

      res.json({
        thisWeek: {
          revenue: thisWeekRevenue,
          expenses: thisWeekExpenseTotal,
          profit: thisWeekRevenue - thisWeekExpenseTotal,
        },
        lastWeek: {
          revenue: lastWeekRevenue,
          expenses: lastWeekExpenseTotal,
          profit: lastWeekRevenue - lastWeekExpenseTotal,
        },
        outstanding: {
          count: outstandingInvoices.length,
          overdueCount,
          total: outstandingInvoices.reduce((sum, i) => sum + parseFloat(i.invoice.total), 0),
          invoices: outstandingInvoices.map(i => ({ ...i.invoice, client: i.client })),
        },
        recentInvoices: recentInvoices.map(r => ({ ...r.invoice, client: r.client })),
        recentExpenses,
        ytd: {
          revenue: ytdRevenue,
          invoiced: ytdInvoiced,
          expenses: ytdExpenseTotal,
          profit: ytdRevenue - ytdExpenseTotal,
        },
        monthly: {
          revenue: monthlyRevenue,
          invoiced: monthlyInvoiced,
          expenses: monthlyExpenseTotal,
          profit: monthlyRevenue - monthlyExpenseTotal,
        },
        aging: {
          current: agingCurrent,
          days30: agingDays30,
          days60: agingDays60,
          days90Plus: agingDays90Plus,
        },
        summary: {
          totalClients: activeClientsCount,
          totalInvoices: allUserInvoices.length,
          averageInvoiceValue,
        },
        quotes: {
          total: allQuotes.length,
          open: openQuotes.length,
          openTotal: openQuotesTotal,
        },
        variations: variationStats,
        cashPayments: cashStats,
        needsAttention: {
          expiringQuotes: expiringQuotes.map(q => ({ ...q.quote, client: q.client })),
          upcomingOverdue: upcomingOverdue.map(i => ({ ...i.invoice, client: i.client })),
        },
        timeTracking: timeStats,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to get dashboard data" });
    }
  });

  // CSV Import endpoint - accepts mapped invoice data from uploaded CSV
  app.post("/api/invoices/import", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { invoices: importedInvoices, clientMappings } = req.body;

      if (!Array.isArray(importedInvoices) || importedInvoices.length === 0) {
        return res.status(400).json({ error: "No invoices to import" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const inv of importedInvoices) {
        try {
          // Find or create client
          let clientId: number;
          const clientName = inv.client?.trim();

          if (clientName) {
            // Check if client exists
            const [existingClient] = await db.select().from(clients)
              .where(and(eq(clients.userId, req.session.userId!), eq(clients.name, clientName)))
              .limit(1);

            if (existingClient) {
              clientId = existingClient.id;
              // Update client if new info provided
              if (inv.clientEmail || inv.clientMobile || inv.clientPhone) {
                await db.update(clients).set({
                  email: inv.clientEmail || existingClient.email,
                  mobile: inv.clientMobile || existingClient.mobile,
                  phone: inv.clientPhone || existingClient.phone,
                  updatedAt: new Date(),
                }).where(eq(clients.id, clientId));
              }
            } else {
              // Create new client
              const [newClient] = await db.insert(clients).values({
                userId: req.session.userId!,
                name: clientName,
                email: inv.clientEmail || null,
                mobile: inv.clientMobile || null,
                phone: inv.clientPhone || null,
              }).returning();
              clientId = newClient.id;
            }
          } else {
            results.failed++;
            results.errors.push(`Row missing client name: ${inv.invoiceNumber || "unknown"}`);
            continue;
          }

          // Parse amounts (strip commas from formatted numbers like "1,566.00")
          const parseAmount = (val: string) => parseFloat(String(val || "0").replace(/,/g, "")) || 0;
          const subtotal = parseAmount(inv.subtotal);
          const vatAmount = parseAmount(inv.tax);
          const total = parseAmount(inv.total) || subtotal + vatAmount;
          const paidAmount = parseAmount(inv.paid);

          // Determine status
          let status = "sent";
          if (paidAmount >= total && total > 0) {
            status = "paid";
          } else if (inv.status) {
            status = inv.status.toLowerCase();
          }

          // Parse dates (support DD/MM/YYYY format)
          const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            // Try DD/MM/YYYY format first
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              return new Date(year, month, day);
            }
            // Fall back to standard parsing
            return new Date(dateStr);
          };

          const invoiceDate = parseDate(inv.date) || new Date();
          const dueDate = parseDate(inv.dueDate) || new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000);
          const paidDate = inv.paidDate ? parseDate(inv.paidDate) : (status === "paid" ? new Date() : null);

          // Calculate VAT rate from amounts
          let vatRate = 0;
          if (subtotal > 0 && vatAmount > 0) {
            vatRate = vatAmount / subtotal;
          }

          // Create invoice
          const [newInvoice] = await db.insert(invoices).values({
            userId: req.session.userId!,
            clientId,
            invoiceNumber: inv.invoiceNumber || `IMP${Date.now()}`,
            date: invoiceDate,
            dueDate,
            subtotal: subtotal.toFixed(2),
            discount: "0",
            vatRate: vatRate.toFixed(4),
            vatAmount: vatAmount.toFixed(2),
            total: total.toFixed(2),
            paidAmount: paidAmount.toFixed(2),
            status,
            paidDate,
            paymentMethod: status === "paid" ? (inv.paymentMethod || "Bank") : null,
            poNumber: inv.poNumber || null,
            paymentInfo: inv.paymentDetails || null,
            notes: inv.notes || null,
          }).returning();

          // Create a single line item for the total
          await db.insert(invoiceItems).values({
            invoiceId: newInvoice.id,
            description: "Imported invoice",
            quantity: "1",
            rate: subtotal.toFixed(2),
            amount: subtotal.toFixed(2),
          });

          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Failed to import ${inv.invoiceNumber || "unknown"}: ${err.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import invoices" });
    }
  });

  // CSV Export endpoint - generates invoice summary similar to Invoice Simple format
  app.get("/api/invoices/export/csv", requireAuth, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      let query = db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(eq(invoices.userId, req.session.userId!));

      // Apply date filters if provided
      const allInvoices = await query.orderBy(desc(invoices.date));

      let filteredInvoices = allInvoices;
      if (startDate) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.invoice.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.invoice.date) <= new Date(endDate as string));
      }

      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, req.session.userId!)).limit(1);
      const businessName = profile?.businessName || "TradeStack";

      // Format date as DD/MM/YYYY for Irish format
      const formatDateCSV = (date: Date | string | null) => {
        if (!date) return "";
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
      };

      // Build CSV header matching Invoice Simple format
      const headers = [
        "Invoice",
        "Date",
        "Due",
        "Client",
        "Mobile",
        "Phone",
        "Client email",
        "Tax",
        "Subtotal",
        "Total",
        "Taxable",
        "Paid",
        "Paid date",
        "Balance due",
        "Payment details",
        "PO #"
      ];

      // Build CSV rows
      const rows = filteredInvoices.map(({ invoice, client }) => {
        const taxable = parseFloat(invoice.subtotal) - parseFloat(invoice.discount || "0");
        const totalValue = parseFloat(invoice.total);
        const paidValue = parseFloat(invoice.paidAmount || "0");
        const balanceDue = totalValue - paidValue;

        return [
          invoice.invoiceNumber,
          formatDateCSV(invoice.date),
          formatDateCSV(invoice.dueDate),
          client?.name || "",
          client?.mobile || "",
          client?.phone || "",
          client?.email || "",
          invoice.vatAmount,
          invoice.subtotal,
          invoice.total,
          invoice.taxable || (taxable > 0 ? taxable.toFixed(2) : "0"),
          invoice.paidAmount || "0",
          formatDateCSV(invoice.paidDate),
          balanceDue.toFixed(2),
          invoice.paymentDetails || "",
          invoice.poNumber || ""
        ];
      });

      // Create CSV content
      const escapeCSV = (value: string) => {
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const title = `Invoice Summary - ${businessName}`;
      const dateRangeHeader = startDate && endDate ? `${startDate} - ${endDate}` : `Generated on ${new Date().toLocaleDateString("en-GB")}`;

      const csvContent = [
        escapeCSV(title),
        escapeCSV(dateRangeHeader),
        "",
        headers.join(","),
        ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="Invoice-Summary-${startDate || "all"}-${endDate || "all"}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export invoices" });
    }
  });

  // Helper function for date formatting in exports
  const formatDateExport = (date: Date | string | null): string => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Helper function to filter by date range
  const filterByDateRange = <T extends { createdAt?: Date | string | null; date?: Date | string | null }>(
    items: T[],
    startDate?: string,
    endDate?: string
  ): T[] => {
    let filtered = items;
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(i => {
        const itemDate = i.date || i.createdAt;
        return itemDate ? new Date(itemDate) >= start : true;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(i => {
        const itemDate = i.date || i.createdAt;
        return itemDate ? new Date(itemDate) <= end : true;
      });
    }
    return filtered;
  };

  // Helper to create workbook from data
  const createExcelWorkbook = (data: any[][], sheetName: string): Buffer => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  };

  // Generic export endpoint for invoices
  app.get("/api/export/invoices", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, format = "csv" } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(invoices.organizationId, req.session.organizationId)
        : eq(invoices.userId, req.session.userId!);

      const allInvoices = await db.select({
        invoice: invoices,
        client: clients,
      }).from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(accessCondition)
        .orderBy(desc(invoices.date));

      const filtered = filterByDateRange(
        allInvoices.map(i => ({ ...i.invoice, clientName: i.client?.name || "" })),
        startDate as string,
        endDate as string
      );

      const headers = ["Invoice #", "Date", "Due Date", "Client", "Subtotal", "VAT", "Total", "Status", "Paid Amount", "Paid Date"];
      const rows = filtered.map(inv => [
        inv.invoiceNumber,
        formatDateExport(inv.date),
        formatDateExport(inv.dueDate),
        inv.clientName,
        inv.subtotal,
        inv.vatAmount,
        inv.total,
        inv.status,
        inv.paidAmount || "0",
        formatDateExport(inv.paidDate),
      ]);

      if (format === "xlsx") {
        const buffer = createExcelWorkbook([headers, ...rows], "Invoices");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-invoices-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvContent = [headers.join(","), ...rows.map(row => row.map(escapeCSV).join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-invoices-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export invoices error:", error);
      res.status(500).json({ error: "Failed to export invoices" });
    }
  });

  // Export expenses
  app.get("/api/export/expenses", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, format = "csv" } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(expenses.organizationId, req.session.organizationId)
        : eq(expenses.userId, req.session.userId!);

      const allExpenses = await db.select().from(expenses)
        .where(accessCondition)
        .orderBy(desc(expenses.date));

      const filtered = filterByDateRange(allExpenses, startDate as string, endDate as string);

      const headers = ["Date", "Vendor", "Category", "Description", "Amount", "Status"];
      const rows = filtered.map(exp => [
        formatDateExport(exp.date),
        exp.vendor,
        exp.category,
        exp.description || "",
        exp.amount,
        exp.status || "pending",
      ]);

      if (format === "xlsx") {
        const buffer = createExcelWorkbook([headers, ...rows], "Expenses");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-expenses-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvContent = [headers.join(","), ...rows.map(row => row.map(escapeCSV).join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-expenses-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export expenses error:", error);
      res.status(500).json({ error: "Failed to export expenses" });
    }
  });

  // Export clients
  app.get("/api/export/clients", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { format = "csv" } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);

      const allClients = await db.select().from(clients)
        .where(accessCondition)
        .orderBy(clients.name);

      const headers = ["Name", "Email", "Phone", "Mobile", "Address", "VAT Number", "Notes"];
      const rows = allClients.map(c => [
        c.name,
        c.email || "",
        c.phone || "",
        c.mobile || "",
        c.address || "",
        c.vatNumber || "",
        c.notes || "",
      ]);

      if (format === "xlsx") {
        const buffer = createExcelWorkbook([headers, ...rows], "Clients");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-clients-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvContent = [headers.join(","), ...rows.map(row => row.map(escapeCSV).join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-clients-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export clients error:", error);
      res.status(500).json({ error: "Failed to export clients" });
    }
  });

  // Export time entries
  app.get("/api/export/time-entries", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, format = "csv" } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(timeEntries.organizationId, req.session.organizationId)
        : eq(timeEntries.userId, req.session.userId!);

      const allEntries = await db.select({
        entry: timeEntries,
        client: clients,
      }).from(timeEntries)
        .leftJoin(clients, eq(timeEntries.clientId, clients.id))
        .where(accessCondition)
        .orderBy(desc(timeEntries.date));

      const filtered = filterByDateRange(
        allEntries.map(e => ({ ...e.entry, clientName: e.client?.name || "" })),
        startDate as string,
        endDate as string
      );

      const headers = ["Date", "Client", "Description", "Duration (hrs)", "Hourly Rate", "Amount", "Billable", "Billed"];
      const rows = filtered.map(entry => [
        formatDateExport(entry.date),
        entry.clientName,
        entry.description || "",
        (entry.duration ? (entry.duration / 3600).toFixed(2) : "0"),
        entry.hourlyRate || "0",
        entry.amount || "0",
        entry.billable ? "Yes" : "No",
        entry.billed ? "Yes" : "No",
      ]);

      if (format === "xlsx") {
        const buffer = createExcelWorkbook([headers, ...rows], "Time Entries");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-time-entries-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvContent = [headers.join(","), ...rows.map(row => row.map(escapeCSV).join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-time-entries-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export time entries error:", error);
      res.status(500).json({ error: "Failed to export time entries" });
    }
  });

  // Export materials
  app.get("/api/export/materials", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { format = "csv" } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const allMaterials = await db.select({
        material: materials,
        client: clients,
      }).from(materials)
        .leftJoin(clients, eq(materials.clientId, clients.id))
        .where(accessCondition)
        .orderBy(desc(materials.createdAt));

      const headers = ["Name", "Quantity", "Unit", "Cost", "Supplier", "Client", "Job Description"];
      const rows = allMaterials.map(m => [
        m.material.name,
        m.material.quantity || "1",
        m.material.unit || "",
        m.material.cost || "0",
        m.material.supplier || "",
        m.client?.name || "",
        m.material.jobDescription || "",
      ]);

      if (format === "xlsx") {
        const buffer = createExcelWorkbook([headers, ...rows], "Materials");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-materials-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvContent = [headers.join(","), ...rows.map(row => row.map(escapeCSV).join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-materials-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export materials error:", error);
      res.status(500).json({ error: "Failed to export materials" });
    }
  });

  // Full data backup endpoint
  app.get("/api/export/backup", requireAuth, loadOrganization, canRead, async (req: Request, res: Response) => {
    try {
      const { format = "xlsx" } = req.query;

      // Use organization context if available, otherwise use userId
      const clientsCondition = req.session.organizationId
        ? eq(clients.organizationId, req.session.organizationId)
        : eq(clients.userId, req.session.userId!);
      const expensesCondition = req.session.organizationId
        ? eq(expenses.organizationId, req.session.organizationId)
        : eq(expenses.userId, req.session.userId!);
      const invoicesCondition = req.session.organizationId
        ? eq(invoices.organizationId, req.session.organizationId)
        : eq(invoices.userId, req.session.userId!);
      const timeEntriesCondition = req.session.organizationId
        ? eq(timeEntries.organizationId, req.session.organizationId)
        : eq(timeEntries.userId, req.session.userId!);
      const materialsCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);
      const itemsCondition = req.session.organizationId
        ? eq(savedItems.organizationId, req.session.organizationId)
        : eq(savedItems.userId, req.session.userId!);
      const quotesCondition = req.session.organizationId
        ? eq(quotes.organizationId, req.session.organizationId)
        : eq(quotes.userId, req.session.userId!);

      // Fetch all data
      const [
        userClients,
        userExpenses,
        userInvoicesData,
        userTimeEntries,
        userMaterials,
        userItems,
        userQuotes,
      ] = await Promise.all([
        db.select().from(clients).where(clientsCondition),
        db.select().from(expenses).where(expensesCondition),
        db.select({ invoice: invoices, client: clients })
          .from(invoices)
          .leftJoin(clients, eq(invoices.clientId, clients.id))
          .where(invoicesCondition),
        db.select({ entry: timeEntries, client: clients })
          .from(timeEntries)
          .leftJoin(clients, eq(timeEntries.clientId, clients.id))
          .where(timeEntriesCondition),
        db.select({ material: materials, client: clients })
          .from(materials)
          .leftJoin(clients, eq(materials.clientId, clients.id))
          .where(materialsCondition),
        db.select().from(savedItems).where(itemsCondition),
        db.select({ quote: quotes, client: clients })
          .from(quotes)
          .leftJoin(clients, eq(quotes.clientId, clients.id))
          .where(quotesCondition),
      ]);

      // Prepare data sheets
      const clientsData = [
        ["Name", "Email", "Phone", "Mobile", "Address", "VAT Number", "Notes"],
        ...userClients.map(c => [c.name, c.email || "", c.phone || "", c.mobile || "", c.address || "", c.vatNumber || "", c.notes || ""]),
      ];

      const expensesData = [
        ["Date", "Vendor", "Category", "Description", "Amount", "Status"],
        ...userExpenses.map(e => [formatDateExport(e.date), e.vendor, e.category, e.description || "", e.amount, e.status || ""]),
      ];

      const invoicesData = [
        ["Invoice #", "Date", "Due Date", "Client", "Subtotal", "VAT", "Total", "Status", "Paid Amount"],
        ...userInvoicesData.map(i => [
          i.invoice.invoiceNumber, formatDateExport(i.invoice.date), formatDateExport(i.invoice.dueDate),
          i.client?.name || "", i.invoice.subtotal, i.invoice.vatAmount, i.invoice.total, i.invoice.status, i.invoice.paidAmount || "0",
        ]),
      ];

      const timeEntriesData = [
        ["Date", "Client", "Description", "Duration (hrs)", "Hourly Rate", "Amount", "Billable", "Billed"],
        ...userTimeEntries.map(t => [
          formatDateExport(t.entry.date), t.client?.name || "", t.entry.description || "",
          t.entry.duration ? (t.entry.duration / 3600).toFixed(2) : "0", t.entry.hourlyRate || "0", t.entry.amount || "0",
          t.entry.billable ? "Yes" : "No", t.entry.billed ? "Yes" : "No",
        ]),
      ];

      const materialsData = [
        ["Name", "Quantity", "Unit", "Cost", "Supplier", "Client", "Job Description"],
        ...userMaterials.map(m => [
          m.material.name, m.material.quantity || "1", m.material.unit || "", m.material.cost || "0",
          m.material.supplier || "", m.client?.name || "", m.material.jobDescription || "",
        ]),
      ];

      const itemsData = [
        ["Name", "Description", "Rate", "VAT Rate", "Unit"],
        ...userItems.map(i => [i.name, i.description || "", i.rate, i.vatRate, i.unit || ""]),
      ];

      const quotesData = [
        ["Quote #", "Date", "Client", "Subtotal", "VAT", "Total", "Status"],
        ...userQuotes.map(q => [
          q.quote.quoteNumber, formatDateExport(q.quote.date), q.client?.name || "",
          q.quote.subtotal, q.quote.vatAmount, q.quote.total, q.quote.status,
        ]),
      ];

      if (format === "xlsx") {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clientsData), "Clients");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invoicesData), "Invoices");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expensesData), "Expenses");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(timeEntriesData), "Time Entries");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(materialsData), "Materials");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemsData), "Products & Services");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(quotesData), "Quotes");

        const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-backup-${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buffer);
      } else {
        // For CSV backup, combine all data with section headers
        const escapeCSV = (value: any) => {
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const sections = [
          "=== CLIENTS ===", clientsData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== INVOICES ===", invoicesData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== EXPENSES ===", expensesData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== TIME ENTRIES ===", timeEntriesData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== MATERIALS ===", materialsData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== PRODUCTS & SERVICES ===", itemsData.map(row => row.map(escapeCSV).join(",")).join("\n"),
          "", "=== QUOTES ===", quotesData.map(row => row.map(escapeCSV).join(",")).join("\n"),
        ];

        const csvContent = sections.join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="quotr-backup-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Saved Items (Products/Services Catalog) API
  app.get("/api/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const items = await db.select().from(savedItems)
        .where(eq(savedItems.userId, req.session.userId!))
        .orderBy(savedItems.name);
      res.json(items);
    } catch (error) {
      console.error("Get items error:", error);
      res.status(500).json({ error: "Failed to get items" });
    }
  });

  app.post("/api/items", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { name, description, rate, vatRate, unit } = req.body;
      const [item] = await db.insert(savedItems).values({
        userId: req.session.userId!,
        name,
        description,
        rate: rate?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        unit: unit || "each",
      }).returning();
      res.status(201).json(item);
    } catch (error) {
      console.error("Create item error:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      const { name, description, rate, vatRate, unit } = req.body;
      const [item] = await db.update(savedItems)
        .set({
          name,
          description,
          rate: rate?.toString(),
          vatRate: vatRate?.toString(),
          unit,
          updatedAt: new Date(),
        })
        .where(and(
          eq(savedItems.id, itemId),
          eq(savedItems.userId, req.session.userId!)
        ))
        .returning();
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Update item error:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      await db.delete(savedItems).where(and(
        eq(savedItems.id, itemId),
        eq(savedItems.userId, req.session.userId!)
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete item error:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Service Templates API - bundles of items for quick quote/invoice creation
  app.get("/api/service-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(serviceTemplates.organizationId, req.session.organizationId)
        : eq(serviceTemplates.userId, req.session.userId!);

      const templates = await db.select().from(serviceTemplates)
        .where(accessCondition)
        .orderBy(serviceTemplates.name);

      const templatesWithItems = await Promise.all(
        templates.map(async (template) => {
          const items = await db.select().from(serviceTemplateItems)
            .where(eq(serviceTemplateItems.templateId, template.id))
            .orderBy(serviceTemplateItems.sortOrder);
          return { ...template, items };
        })
      );

      res.json(templatesWithItems);
    } catch (error) {
      console.error("Get service templates error:", error);
      res.status(500).json({ error: "Failed to get service templates" });
    }
  });

  app.get("/api/service-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(serviceTemplates.organizationId, req.session.organizationId)
        : eq(serviceTemplates.userId, req.session.userId!);

      const [template] = await db.select().from(serviceTemplates)
        .where(and(eq(serviceTemplates.id, templateId), accessCondition))
        .limit(1);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const items = await db.select().from(serviceTemplateItems)
        .where(eq(serviceTemplateItems.templateId, templateId))
        .orderBy(serviceTemplateItems.sortOrder);

      res.json({ ...template, items });
    } catch (error) {
      console.error("Get service template error:", error);
      res.status(500).json({ error: "Failed to get service template" });
    }
  });

  app.post("/api/service-templates", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { name, description, notes, vatRate, items } = req.body;

      const [template] = await db.insert(serviceTemplates).values({
        userId: req.session.userId!,
        organizationId: req.session.organizationId || null,
        name,
        description,
        notes,
        vatRate: vatRate?.toString() || "0.23",
        isActive: true,
      }).returning();

      if (items && items.length > 0) {
        await db.insert(serviceTemplateItems).values(
          items.map((item: any, index: number) => ({
            templateId: template.id,
            description: item.description,
            quantity: item.quantity?.toString() || "1",
            rate: item.rate?.toString() || "0",
            sortOrder: index,
          }))
        );
      }

      const templateItems = await db.select().from(serviceTemplateItems)
        .where(eq(serviceTemplateItems.templateId, template.id))
        .orderBy(serviceTemplateItems.sortOrder);

      res.status(201).json({ ...template, items: templateItems });
    } catch (error) {
      console.error("Create service template error:", error);
      res.status(500).json({ error: "Failed to create service template" });
    }
  });

  app.put("/api/service-templates/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const { name, description, notes, vatRate, isActive, items } = req.body;

      const accessCondition = req.session.organizationId
        ? eq(serviceTemplates.organizationId, req.session.organizationId)
        : eq(serviceTemplates.userId, req.session.userId!);

      const [template] = await db.update(serviceTemplates)
        .set({
          name,
          description,
          notes,
          vatRate: vatRate?.toString(),
          isActive,
          updatedAt: new Date(),
        })
        .where(and(eq(serviceTemplates.id, templateId), accessCondition))
        .returning();

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      if (items) {
        await db.delete(serviceTemplateItems).where(eq(serviceTemplateItems.templateId, templateId));

        if (items.length > 0) {
          await db.insert(serviceTemplateItems).values(
            items.map((item: any, index: number) => ({
              templateId: template.id,
              description: item.description,
              quantity: item.quantity?.toString() || "1",
              rate: item.rate?.toString() || "0",
              sortOrder: index,
            }))
          );
        }
      }

      const templateItems = await db.select().from(serviceTemplateItems)
        .where(eq(serviceTemplateItems.templateId, template.id))
        .orderBy(serviceTemplateItems.sortOrder);

      res.json({ ...template, items: templateItems });
    } catch (error) {
      console.error("Update service template error:", error);
      res.status(500).json({ error: "Failed to update service template" });
    }
  });

  app.delete("/api/service-templates/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(serviceTemplates.organizationId, req.session.organizationId)
        : eq(serviceTemplates.userId, req.session.userId!);

      await db.delete(serviceTemplates).where(and(eq(serviceTemplates.id, templateId), accessCondition));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete service template error:", error);
      res.status(500).json({ error: "Failed to delete service template" });
    }
  });

  // Global Templates API - trade-specific template catalog
  app.get("/api/global-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const { category } = req.query;

      let orgTradeType: string | null = null;
      if (req.session.organizationId) {
        const [org] = await db.select().from(organizations)
          .where(eq(organizations.id, req.session.organizationId))
          .limit(1);
        orgTradeType = org?.tradeType || null;
      }

      if (!orgTradeType) {
        return res.json([]);
      }

      const conditions = [
        eq(globalTemplates.tradeType, orgTradeType),
        eq(globalTemplates.isActive, true),
      ];

      if (category && typeof category === "string") {
        conditions.push(eq(globalTemplates.category, category));
      }

      const templates = await db.select().from(globalTemplates)
        .where(and(...conditions))
        .orderBy(globalTemplates.isRecommended, globalTemplates.sortOrder, globalTemplates.name);

      const templatesWithItems = await Promise.all(
        templates.map(async (template) => {
          const items = await db.select().from(globalTemplateItems)
            .where(eq(globalTemplateItems.templateId, template.id))
            .orderBy(globalTemplateItems.sortOrder);
          return { ...template, items };
        })
      );

      res.json(templatesWithItems);
    } catch (error) {
      console.error("Get global templates error:", error);
      res.status(500).json({ error: "Failed to get global templates" });
    }
  });

  app.get("/api/global-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);

      let orgTradeType: string | null = null;
      if (req.session.organizationId) {
        const [org] = await db.select().from(organizations)
          .where(eq(organizations.id, req.session.organizationId))
          .limit(1);
        orgTradeType = org?.tradeType || null;
      }

      const [template] = await db.select().from(globalTemplates)
        .where(and(
          eq(globalTemplates.id, templateId),
          eq(globalTemplates.isActive, true)
        ))
        .limit(1);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      if (template.tradeType !== orgTradeType) {
        return res.status(403).json({ error: "Template not available for your trade" });
      }

      const items = await db.select().from(globalTemplateItems)
        .where(eq(globalTemplateItems.templateId, templateId))
        .orderBy(globalTemplateItems.sortOrder);

      res.json({ ...template, items });
    } catch (error) {
      console.error("Get global template error:", error);
      res.status(500).json({ error: "Failed to get global template" });
    }
  });

  app.get("/api/global-templates/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const categories = [
        { value: "callout", label: "Callout" },
        { value: "compliance", label: "Compliance" },
        { value: "install", label: "Installation" },
        { value: "projects", label: "Projects" },
        { value: "contracts", label: "Contracts" },
        { value: "diagnostic", label: "Diagnostic" },
        { value: "maintenance", label: "Maintenance" },
        { value: "repair", label: "Repair" },
      ];
      res.json(categories);
    } catch (error) {
      console.error("Get template categories error:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  // Quotes API
  app.get("/api/quotes", requireAuth, async (req: Request, res: Response) => {
    try {
      const allQuotes = await db.select().from(quotes)
        .where(eq(quotes.userId, req.session.userId!))
        .orderBy(desc(quotes.date));

      const quotesWithClients = await Promise.all(
        allQuotes.map(async (quote) => {
          const [client] = quote.clientId
            ? await db.select().from(clients).where(eq(clients.id, quote.clientId)).limit(1)
            : [null];
          const items = await db.select().from(quoteItems)
            .where(eq(quoteItems.quoteId, quote.id));
          return { ...quote, client, items };
        })
      );
      res.json(quotesWithClients);
    } catch (error) {
      console.error("Get quotes error:", error);
      res.status(500).json({ error: "Failed to get quotes" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const [quote] = await db.select().from(quotes)
        .where(and(
          eq(quotes.id, quoteId),
          eq(quotes.userId, req.session.userId!)
        ))
        .limit(1);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      const [client] = quote.clientId
        ? await db.select().from(clients).where(eq(clients.id, quote.clientId)).limit(1)
        : [null];
      const items = await db.select().from(quoteItems)
        .where(eq(quoteItems.quoteId, quote.id));
      res.json({ ...quote, client, items });
    } catch (error) {
      console.error("Get quote error:", error);
      res.status(500).json({ error: "Failed to get quote" });
    }
  });

  app.post("/api/quotes", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, clientData, date, validUntil, subtotal, discount, vatRate, vatAmount, total, notes, items } = req.body;

      let finalClientId = clientId;
      const organizationId = req.session.organizationId!;

      if (clientId) {
        const [existingClient] = await db.select().from(clients)
          .where(and(
            eq(clients.id, clientId),
            eq(clients.organizationId, organizationId)
          ))
          .limit(1);

        if (!existingClient) {
          return res.status(404).json({ error: "Client not found in your organization" });
        }
      } else if (clientData?.name) {
        const [newClient] = await db.insert(clients).values({
          userId: req.session.userId!,
          organizationId: organizationId,
          name: clientData.name,
          email: clientData.email || null,
          mobile: clientData.mobile || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          contact: clientData.contact || null,
        }).returning();
        finalClientId = newClient.id;
      }

      if (!finalClientId) {
        return res.status(400).json({ error: "Client is required for quotes. Provide clientId or clientData with at least a name." });
      }

      // Generate organization-scoped quote number
      const existingQuotes = await db.select().from(quotes)
        .where(eq(quotes.organizationId, organizationId));
      const quoteNumber = `QUO-${String(existingQuotes.length + 1).padStart(4, "0")}`;

      const [quote] = await db.insert(quotes).values({
        userId: req.session.userId!,
        organizationId: organizationId,
        clientId: finalClientId,
        quoteNumber,
        date: new Date(date),
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal: subtotal?.toString() || "0",
        discount: discount?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        vatAmount: vatAmount?.toString() || "0",
        total: total?.toString() || "0",
        notes,
        status: "open",
      }).returning();

      // Log activity
      await logActivity(req, "create_quote", "quote", quote.id, { quoteNumber, total });

      if (items && items.length > 0) {
        await db.insert(quoteItems).values(
          items.map((item: any) => ({
            quoteId: quote.id,
            description: item.description,
            quantity: item.quantity?.toString() || "1",
            rate: item.rate?.toString() || "0",
            amount: item.amount?.toString() || "0",
          }))
        );
      }
      res.status(201).json(quote);
    } catch (error) {
      console.error("Create quote error:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  app.put("/api/quotes/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { clientId, clientData, date, validUntil, subtotal, discount, vatRate, vatAmount, total, notes, status, items } = req.body;
      const organizationId = req.session.organizationId!;

      let finalClientId = clientId;

      if (clientId) {
        const [existingClient] = await db.select().from(clients)
          .where(and(
            eq(clients.id, clientId),
            eq(clients.organizationId, organizationId)
          ))
          .limit(1);

        if (!existingClient) {
          return res.status(404).json({ error: "Client not found in your organization" });
        }
      } else if (clientData?.name) {
        const [newClient] = await db.insert(clients).values({
          userId: req.session.userId!,
          organizationId: organizationId,
          name: clientData.name,
          email: clientData.email || null,
          mobile: clientData.mobile || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          contact: clientData.contact || null,
        }).returning();
        finalClientId = newClient.id;
      }

      const [quote] = await db.update(quotes)
        .set({
          clientId: finalClientId || undefined,
          date: date ? new Date(date) : undefined,
          validUntil: validUntil ? new Date(validUntil) : null,
          subtotal: subtotal?.toString(),
          discount: discount?.toString(),
          vatRate: vatRate?.toString(),
          vatAmount: vatAmount?.toString(),
          total: total?.toString(),
          notes,
          status,
          updatedAt: new Date(),
        })
        .where(and(
          eq(quotes.id, quoteId),
          eq(quotes.organizationId, organizationId)
        ))
        .returning();

      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      if (items) {
        await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
        if (items.length > 0) {
          await db.insert(quoteItems).values(
            items.map((item: any) => ({
              quoteId,
              description: item.description,
              quantity: item.quantity?.toString() || "1",
              rate: item.rate?.toString() || "0",
              amount: item.amount?.toString() || "0",
            }))
          );
        }
      }
      res.json(quote);
    } catch (error) {
      console.error("Update quote error:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      await db.delete(quotes).where(and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, organizationId)
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete quote error:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Save customer signature on quote
  app.post("/api/quotes/:id/signature", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      const { signature, signedName } = req.body;

      if (!signature) {
        return res.status(400).json({ error: "Signature is required" });
      }

      const [quote] = await db.update(quotes)
        .set({
          customerSignature: signature,
          customerSignedAt: new Date(),
          customerSignedName: signedName || "Customer",
        })
        .where(and(
          eq(quotes.id, quoteId),
          eq(quotes.organizationId, organizationId)
        ))
        .returning();

      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Save signature error:", error);
      res.status(500).json({ error: "Failed to save signature" });
    }
  });

  // Convert Quote to Invoice
  app.post("/api/quotes/:id/convert", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const [quote] = await db.select().from(quotes)
        .where(and(
          eq(quotes.id, quoteId),
          eq(quotes.userId, req.session.userId!)
        ))
        .limit(1);

      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      if (!quote.clientId) {
        return res.status(400).json({ error: "Quote must have a client to convert to invoice" });
      }

      // Get quote items
      const items = await db.select().from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));

      // Generate invoice number
      const existingInvoices = await db.select().from(invoices)
        .where(eq(invoices.userId, req.session.userId!));
      const invoiceNumber = `INV-${String(existingInvoices.length + 1).padStart(4, "0")}`;

      // Get client payment terms
      const [client] = await db.select().from(clients)
        .where(eq(clients.id, quote.clientId))
        .limit(1);
      const paymentTerms = client?.paymentTerms || 30;

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      // Create invoice
      const [invoice] = await db.insert(invoices).values({
        userId: req.session.userId!,
        clientId: quote.clientId,
        invoiceNumber,
        date: invoiceDate,
        dueDate,
        subtotal: quote.subtotal,
        discount: quote.discount,
        vatRate: quote.vatRate,
        vatAmount: quote.vatAmount,
        total: quote.total,
        notes: quote.notes,
        status: "draft",
      }).returning();

      // Create invoice items
      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        );
      }

      // Update quote status
      await db.update(quotes)
        .set({
          status: "converted",
          convertedToInvoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId));

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Convert quote error:", error);
      res.status(500).json({ error: "Failed to convert quote to invoice" });
    }
  });

  // Variation Orders API
  app.get("/api/variations", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const { status, clientId, quoteId, invoiceId } = req.query;

      let query = db.select().from(variationOrders)
        .where(eq(variationOrders.organizationId, organizationId))
        .orderBy(desc(variationOrders.createdAt));

      const allVariations = await query;

      let filtered = allVariations;
      if (status) {
        filtered = filtered.filter(v => v.status === status);
      }
      if (clientId) {
        filtered = filtered.filter(v => v.clientId === parseInt(clientId as string));
      }
      if (quoteId) {
        filtered = filtered.filter(v => v.parentQuoteId === parseInt(quoteId as string));
      }
      if (invoiceId) {
        filtered = filtered.filter(v => v.parentInvoiceId === parseInt(invoiceId as string));
      }

      const variationsWithDetails = await Promise.all(
        filtered.map(async (variation) => {
          const [client] = await db.select().from(clients)
            .where(eq(clients.id, variation.clientId))
            .limit(1);
          const items = await db.select().from(variationItems)
            .where(eq(variationItems.variationId, variation.id));
          const [parentQuote] = variation.parentQuoteId
            ? await db.select().from(quotes).where(eq(quotes.id, variation.parentQuoteId)).limit(1)
            : [null];
          const [parentInvoice] = variation.parentInvoiceId
            ? await db.select().from(invoices).where(eq(invoices.id, variation.parentInvoiceId)).limit(1)
            : [null];
          return { ...variation, client, items, parentQuote, parentInvoice };
        })
      );
      res.json(variationsWithDetails);
    } catch (error) {
      console.error("Get variations error:", error);
      res.status(500).json({ error: "Failed to get variations" });
    }
  });

  app.get("/api/variations/:id", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [variation] = await db.select().from(variationOrders)
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId)
        ))
        .limit(1);

      if (!variation) {
        return res.status(404).json({ error: "Variation not found" });
      }

      const [client] = await db.select().from(clients)
        .where(eq(clients.id, variation.clientId))
        .limit(1);
      const items = await db.select().from(variationItems)
        .where(eq(variationItems.variationId, variation.id));
      const [parentQuote] = variation.parentQuoteId
        ? await db.select().from(quotes).where(eq(quotes.id, variation.parentQuoteId)).limit(1)
        : [null];
      const [parentInvoice] = variation.parentInvoiceId
        ? await db.select().from(invoices).where(eq(invoices.id, variation.parentInvoiceId)).limit(1)
        : [null];

      res.json({ ...variation, client, items, parentQuote, parentInvoice });
    } catch (error) {
      console.error("Get variation error:", error);
      res.status(500).json({ error: "Failed to get variation" });
    }
  });

  app.post("/api/variations", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, parentQuoteId, parentInvoiceId, title, description, reason, date, subtotal, discount, vatRate, vatAmount, total, notes, items } = req.body;
      const organizationId = req.session.organizationId!;

      if (!clientId) {
        return res.status(400).json({ error: "Client is required" });
      }
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const [existingClient] = await db.select().from(clients)
        .where(and(
          eq(clients.id, clientId),
          eq(clients.organizationId, organizationId)
        ))
        .limit(1);

      if (!existingClient) {
        return res.status(404).json({ error: "Client not found in your organization" });
      }

      const existingVariations = await db.select().from(variationOrders)
        .where(eq(variationOrders.organizationId, organizationId));
      const variationNumber = `VAR-${String(existingVariations.length + 1).padStart(4, "0")}`;

      const [variation] = await db.insert(variationOrders).values({
        userId: req.session.userId!,
        organizationId,
        clientId,
        parentQuoteId: parentQuoteId || null,
        parentInvoiceId: parentInvoiceId || null,
        variationNumber,
        title,
        description: description || null,
        reason: reason || null,
        date: new Date(date || Date.now()),
        subtotal: subtotal?.toString() || "0",
        discount: discount?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        vatAmount: vatAmount?.toString() || "0",
        total: total?.toString() || "0",
        notes: notes || null,
        status: "draft",
      }).returning();

      if (items && items.length > 0) {
        await db.insert(variationItems).values(
          items.map((item: any) => ({
            variationId: variation.id,
            description: item.description,
            quantity: item.quantity?.toString() || "1",
            rate: item.rate?.toString() || "0",
            amount: item.amount?.toString() || "0",
          }))
        );
      }

      res.status(201).json(variation);
    } catch (error) {
      console.error("Create variation error:", error);
      res.status(500).json({ error: "Failed to create variation" });
    }
  });

  app.put("/api/variations/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const { title, description, reason, date, subtotal, discount, vatRate, vatAmount, total, notes, items } = req.body;
      const organizationId = req.session.organizationId!;

      const [variation] = await db.update(variationOrders)
        .set({
          title,
          description,
          reason,
          date: date ? new Date(date) : undefined,
          subtotal: subtotal?.toString(),
          discount: discount?.toString(),
          vatRate: vatRate?.toString(),
          vatAmount: vatAmount?.toString(),
          total: total?.toString(),
          notes,
          updatedAt: new Date(),
        })
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId)
        ))
        .returning();

      if (!variation) {
        return res.status(404).json({ error: "Variation not found" });
      }

      if (items) {
        await db.delete(variationItems).where(eq(variationItems.variationId, variationId));
        if (items.length > 0) {
          await db.insert(variationItems).values(
            items.map((item: any) => ({
              variationId,
              description: item.description,
              quantity: item.quantity?.toString() || "1",
              rate: item.rate?.toString() || "0",
              amount: item.amount?.toString() || "0",
            }))
          );
        }
      }
      res.json(variation);
    } catch (error) {
      console.error("Update variation error:", error);
      res.status(500).json({ error: "Failed to update variation" });
    }
  });

  app.delete("/api/variations/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      await db.delete(variationOrders).where(and(
        eq(variationOrders.id, variationId),
        eq(variationOrders.organizationId, organizationId)
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete variation error:", error);
      res.status(500).json({ error: "Failed to delete variation" });
    }
  });

  app.post("/api/variations/:id/submit", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [variation] = await db.update(variationOrders)
        .set({
          status: "pending_approval",
          updatedAt: new Date(),
        })
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId),
          eq(variationOrders.status, "draft")
        ))
        .returning();

      if (!variation) {
        return res.status(404).json({ error: "Variation not found or not in draft status" });
      }
      res.json(variation);
    } catch (error) {
      console.error("Submit variation error:", error);
      res.status(500).json({ error: "Failed to submit variation" });
    }
  });

  app.post("/api/variations/:id/approve", requireAuth, canManage, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [variation] = await db.update(variationOrders)
        .set({
          status: "approved",
          approvedBy: req.session.userId!,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId),
          eq(variationOrders.status, "pending_approval")
        ))
        .returning();

      if (!variation) {
        return res.status(404).json({ error: "Variation not found or not pending approval" });
      }
      res.json(variation);
    } catch (error) {
      console.error("Approve variation error:", error);
      res.status(500).json({ error: "Failed to approve variation" });
    }
  });

  app.post("/api/variations/:id/reject", requireAuth, canManage, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const { reason } = req.body;
      const organizationId = req.session.organizationId!;

      const [variation] = await db.update(variationOrders)
        .set({
          status: "rejected",
          rejectedReason: reason || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId),
          eq(variationOrders.status, "pending_approval")
        ))
        .returning();

      if (!variation) {
        return res.status(404).json({ error: "Variation not found or not pending approval" });
      }
      res.json(variation);
    } catch (error) {
      console.error("Reject variation error:", error);
      res.status(500).json({ error: "Failed to reject variation" });
    }
  });

  app.post("/api/variations/:id/convert", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const variationId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [variation] = await db.select().from(variationOrders)
        .where(and(
          eq(variationOrders.id, variationId),
          eq(variationOrders.organizationId, organizationId),
          eq(variationOrders.status, "approved")
        ))
        .limit(1);

      if (!variation) {
        return res.status(404).json({ error: "Variation not found or not approved" });
      }

      const items = await db.select().from(variationItems)
        .where(eq(variationItems.variationId, variationId));

      const existingInvoices = await db.select().from(invoices)
        .where(eq(invoices.organizationId, organizationId));

      let invoiceNumber: string;
      if (variation.parentInvoiceId) {
        const [parentInvoice] = await db.select().from(invoices)
          .where(eq(invoices.id, variation.parentInvoiceId))
          .limit(1);
        invoiceNumber = parentInvoice
          ? `${parentInvoice.invoiceNumber}-V${variation.variationNumber.split('-')[1]}`
          : `INV-${String(existingInvoices.length + 1).padStart(4, "0")}`;
      } else {
        invoiceNumber = `INV-${String(existingInvoices.length + 1).padStart(4, "0")}`;
      }

      const [client] = await db.select().from(clients)
        .where(eq(clients.id, variation.clientId))
        .limit(1);
      const paymentTerms = client?.paymentTerms || 30;

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      const [invoice] = await db.insert(invoices).values({
        userId: req.session.userId!,
        organizationId,
        clientId: variation.clientId,
        invoiceNumber,
        date: invoiceDate,
        dueDate,
        subtotal: variation.subtotal,
        discount: variation.discount,
        vatRate: variation.vatRate,
        vatAmount: variation.vatAmount,
        total: variation.total,
        notes: `Variation: ${variation.title}\n${variation.notes || ''}`,
        status: "draft",
      }).returning();

      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        );
      }

      await db.update(variationOrders)
        .set({
          status: "invoiced",
          convertedToInvoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(eq(variationOrders.id, variationId));

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Convert variation error:", error);
      res.status(500).json({ error: "Failed to convert variation to invoice" });
    }
  });

  app.get("/api/quotes/:id/variations", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const variations = await db.select().from(variationOrders)
        .where(and(
          eq(variationOrders.parentQuoteId, quoteId),
          eq(variationOrders.organizationId, organizationId)
        ))
        .orderBy(desc(variationOrders.createdAt));

      const variationsWithItems = await Promise.all(
        variations.map(async (v) => {
          const items = await db.select().from(variationItems)
            .where(eq(variationItems.variationId, v.id));
          return { ...v, items };
        })
      );
      res.json(variationsWithItems);
    } catch (error) {
      console.error("Get quote variations error:", error);
      res.status(500).json({ error: "Failed to get quote variations" });
    }
  });

  app.get("/api/invoices/:id/variations", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const variations = await db.select().from(variationOrders)
        .where(and(
          eq(variationOrders.parentInvoiceId, invoiceId),
          eq(variationOrders.organizationId, organizationId)
        ))
        .orderBy(desc(variationOrders.createdAt));

      const variationsWithItems = await Promise.all(
        variations.map(async (v) => {
          const items = await db.select().from(variationItems)
            .where(eq(variationItems.variationId, v.id));
          return { ...v, items };
        })
      );
      res.json(variationsWithItems);
    } catch (error) {
      console.error("Get invoice variations error:", error);
      res.status(500).json({ error: "Failed to get invoice variations" });
    }
  });

  app.get("/api/clients/:id/job-totals", requireAuth, canRead, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [clientQuotes] = await db.select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`COALESCE(sum(total::numeric), 0)::text`
      }).from(quotes)
        .where(and(
          eq(quotes.clientId, clientId),
          eq(quotes.organizationId, organizationId)
        ));

      const [clientInvoices] = await db.select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`COALESCE(sum(total::numeric), 0)::text`,
        paid: sql<string>`COALESCE(sum(paid_amount::numeric), 0)::text`
      }).from(invoices)
        .where(and(
          eq(invoices.clientId, clientId),
          eq(invoices.organizationId, organizationId)
        ));

      const [clientVariations] = await db.select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`COALESCE(sum(total::numeric), 0)::text`,
        approved: sql<number>`count(*) FILTER (WHERE status = 'approved' OR status = 'invoiced')::int`
      }).from(variationOrders)
        .where(and(
          eq(variationOrders.clientId, clientId),
          eq(variationOrders.organizationId, organizationId)
        ));

      res.json({
        quotes: clientQuotes,
        invoices: clientInvoices,
        variations: clientVariations,
        totalJobValue: (
          parseFloat(clientInvoices.total || "0") +
          parseFloat(clientVariations.total || "0")
        ).toFixed(2)
      });
    } catch (error) {
      console.error("Get client job totals error:", error);
      res.status(500).json({ error: "Failed to get client job totals" });
    }
  });

  // Recurring Invoices API
  app.get("/api/recurring-invoices", requireAuth, async (req: Request, res: Response) => {
    try {
      const allRecurring = await db.select().from(recurringInvoices)
        .where(eq(recurringInvoices.userId, req.session.userId!))
        .orderBy(desc(recurringInvoices.nextDate));

      const recurringWithDetails = await Promise.all(
        allRecurring.map(async (recurring) => {
          const [client] = await db.select().from(clients)
            .where(eq(clients.id, recurring.clientId))
            .limit(1);
          const items = await db.select().from(recurringInvoiceItems)
            .where(eq(recurringInvoiceItems.recurringInvoiceId, recurring.id));
          return { ...recurring, client, items };
        })
      );
      res.json(recurringWithDetails);
    } catch (error) {
      console.error("Get recurring invoices error:", error);
      res.status(500).json({ error: "Failed to get recurring invoices" });
    }
  });

  app.post("/api/recurring-invoices", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, frequency, dayOfMonth, dayOfWeek, nextDate, endDate, subtotal, discount, vatRate, vatAmount, total, paymentInfo, notes, items } = req.body;

      const [recurring] = await db.insert(recurringInvoices).values({
        userId: req.session.userId!,
        clientId,
        frequency: frequency || "monthly",
        dayOfMonth: dayOfMonth || 1,
        dayOfWeek,
        nextDate: new Date(nextDate),
        endDate: endDate ? new Date(endDate) : null,
        subtotal: subtotal?.toString() || "0",
        discount: discount?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        vatAmount: vatAmount?.toString() || "0",
        total: total?.toString() || "0",
        paymentInfo,
        notes,
        isActive: true,
      }).returning();

      if (items && items.length > 0) {
        await db.insert(recurringInvoiceItems).values(
          items.map((item: any) => ({
            recurringInvoiceId: recurring.id,
            description: item.description,
            quantity: item.quantity?.toString() || "1",
            rate: item.rate?.toString() || "0",
            amount: item.amount?.toString() || "0",
          }))
        );
      }
      res.status(201).json(recurring);
    } catch (error) {
      console.error("Create recurring invoice error:", error);
      res.status(500).json({ error: "Failed to create recurring invoice" });
    }
  });

  app.put("/api/recurring-invoices/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const recurringId = parseInt(req.params.id);
      const { clientId, frequency, dayOfMonth, dayOfWeek, nextDate, endDate, subtotal, discount, vatRate, vatAmount, total, paymentInfo, notes, isActive, items } = req.body;

      const [recurring] = await db.update(recurringInvoices)
        .set({
          clientId,
          frequency,
          dayOfMonth,
          dayOfWeek,
          nextDate: nextDate ? new Date(nextDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
          subtotal: subtotal?.toString(),
          discount: discount?.toString(),
          vatRate: vatRate?.toString(),
          vatAmount: vatAmount?.toString(),
          total: total?.toString(),
          paymentInfo,
          notes,
          isActive,
          updatedAt: new Date(),
        })
        .where(and(
          eq(recurringInvoices.id, recurringId),
          eq(recurringInvoices.userId, req.session.userId!)
        ))
        .returning();

      if (!recurring) {
        return res.status(404).json({ error: "Recurring invoice not found" });
      }

      if (items) {
        await db.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, recurringId));
        if (items.length > 0) {
          await db.insert(recurringInvoiceItems).values(
            items.map((item: any) => ({
              recurringInvoiceId: recurringId,
              description: item.description,
              quantity: item.quantity?.toString() || "1",
              rate: item.rate?.toString() || "0",
              amount: item.amount?.toString() || "0",
            }))
          );
        }
      }
      res.json(recurring);
    } catch (error) {
      console.error("Update recurring invoice error:", error);
      res.status(500).json({ error: "Failed to update recurring invoice" });
    }
  });

  app.delete("/api/recurring-invoices/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const recurringId = parseInt(req.params.id);
      await db.delete(recurringInvoices).where(and(
        eq(recurringInvoices.id, recurringId),
        eq(recurringInvoices.userId, req.session.userId!)
      ));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete recurring invoice error:", error);
      res.status(500).json({ error: "Failed to delete recurring invoice" });
    }
  });

  // Generate invoice from recurring
  app.post("/api/recurring-invoices/:id/generate", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const recurringId = parseInt(req.params.id);
      const [recurring] = await db.select().from(recurringInvoices)
        .where(and(
          eq(recurringInvoices.id, recurringId),
          eq(recurringInvoices.userId, req.session.userId!)
        ))
        .limit(1);

      if (!recurring) {
        return res.status(404).json({ error: "Recurring invoice not found" });
      }

      const items = await db.select().from(recurringInvoiceItems)
        .where(eq(recurringInvoiceItems.recurringInvoiceId, recurringId));

      // Generate invoice number
      const existingInvoices = await db.select().from(invoices)
        .where(eq(invoices.userId, req.session.userId!));
      const invoiceNumber = `INV-${String(existingInvoices.length + 1).padStart(4, "0")}`;

      // Get client payment terms
      const [client] = await db.select().from(clients)
        .where(eq(clients.id, recurring.clientId))
        .limit(1);
      const paymentTerms = client?.paymentTerms || 30;

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      // Create invoice
      const [invoice] = await db.insert(invoices).values({
        userId: req.session.userId!,
        clientId: recurring.clientId,
        invoiceNumber,
        date: invoiceDate,
        dueDate,
        subtotal: recurring.subtotal,
        discount: recurring.discount,
        vatRate: recurring.vatRate,
        vatAmount: recurring.vatAmount,
        total: recurring.total,
        paymentInfo: recurring.paymentInfo,
        notes: recurring.notes,
        status: "sent",
      }).returning();

      // Create invoice items
      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        );
      }

      // Calculate next date based on frequency
      let nextDate = new Date(recurring.nextDate);
      switch (recurring.frequency) {
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "biweekly":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update recurring invoice
      await db.update(recurringInvoices)
        .set({
          nextDate,
          lastGeneratedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recurringInvoices.id, recurringId));

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Generate invoice from recurring error:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Time Entries CRUD
  app.get("/api/time-entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const selectedYear = parseInt(req.query.year as string) || null;
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : null;
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
      const offset = parseInt(req.query.offset as string) || 0;
      let conditions = [eq(timeEntries.userId, req.session.userId!)];

      if (selectedYear) {
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        conditions.push(gte(timeEntries.date, startOfYear));
        conditions.push(lte(timeEntries.date, endOfYear));
      }

      if (jobId) {
        conditions.push(eq(timeEntries.jobId, jobId));
      }

      const entries = await db
        .select({
          id: timeEntries.id,
          userId: timeEntries.userId,
          clientId: timeEntries.clientId,
          clientName: clients.name,
          jobId: timeEntries.jobId,
          jobTitle: jobs.title,
          invoiceId: timeEntries.invoiceId,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          amount: timeEntries.amount,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          notes: timeEntries.notes,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(clients, eq(clients.id, timeEntries.clientId))
        .leftJoin(jobs, eq(jobs.id, timeEntries.jobId))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.date))
        .limit(limit)
        .offset(offset);
      res.json(entries);
    } catch (error) {
      console.error("Get time entries error:", error);
      res.status(500).json({ error: "Failed to get time entries" });
    }
  });

  app.get("/api/time-entries/unbilled", requireAuth, async (req: Request, res: Response) => {
    try {
      const entries = await db
        .select({
          id: timeEntries.id,
          userId: timeEntries.userId,
          clientId: timeEntries.clientId,
          clientName: clients.name,
          jobId: timeEntries.jobId,
          jobTitle: jobs.title,
          invoiceId: timeEntries.invoiceId,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          amount: timeEntries.amount,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          notes: timeEntries.notes,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(clients, eq(clients.id, timeEntries.clientId))
        .leftJoin(jobs, eq(jobs.id, timeEntries.jobId))
        .where(
          and(
            eq(timeEntries.userId, req.session.userId!),
            eq(timeEntries.isBillable, true),
            eq(timeEntries.isBilled, false)
          )
        )
        .orderBy(desc(timeEntries.date));
      res.json(entries);
    } catch (error) {
      console.error("Get unbilled time entries error:", error);
      res.status(500).json({ error: "Failed to get unbilled time entries" });
    }
  });

  app.get("/api/time-entries/client/:clientId", requireAuth, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const entries = await db
        .select({
          id: timeEntries.id,
          userId: timeEntries.userId,
          clientId: timeEntries.clientId,
          clientName: clients.name,
          jobId: timeEntries.jobId,
          jobTitle: jobs.title,
          invoiceId: timeEntries.invoiceId,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          amount: timeEntries.amount,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          notes: timeEntries.notes,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(clients, eq(clients.id, timeEntries.clientId))
        .leftJoin(jobs, eq(jobs.id, timeEntries.jobId))
        .where(
          and(
            eq(timeEntries.userId, req.session.userId!),
            eq(timeEntries.clientId, clientId)
          )
        )
        .orderBy(desc(timeEntries.date));
      res.json(entries);
    } catch (error) {
      console.error("Get client time entries error:", error);
      res.status(500).json({ error: "Failed to get client time entries" });
    }
  });

  app.get("/api/time-entries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [entry] = await db
        .select({
          id: timeEntries.id,
          userId: timeEntries.userId,
          clientId: timeEntries.clientId,
          clientName: clients.name,
          jobId: timeEntries.jobId,
          jobTitle: jobs.title,
          invoiceId: timeEntries.invoiceId,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          amount: timeEntries.amount,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          notes: timeEntries.notes,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(clients, eq(clients.id, timeEntries.clientId))
        .leftJoin(jobs, eq(jobs.id, timeEntries.jobId))
        .where(
          and(
            eq(timeEntries.id, id),
            eq(timeEntries.userId, req.session.userId!)
          )
        );
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Get time entry error:", error);
      res.status(500).json({ error: "Failed to get time entry" });
    }
  });

  app.post("/api/time-entries", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, jobId, description, date, startTime, endTime, duration, hourlyRate, isBillable, notes, latitude, longitude, accuracy, address } = req.body;
      const amount = (duration / 3600) * (parseFloat(hourlyRate) || 0);

      if (!clientId && !jobId) {
        return res.status(400).json({ error: "Client or Job is required" });
      }

      let finalClientId = clientId;
      if (!clientId && jobId) {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
        if (job) finalClientId = job.clientId;
      }

      const [entry] = await db.insert(timeEntries).values({
        userId: req.session.userId!,
        organizationId: req.session.organizationId || null,
        clientId: finalClientId || null,
        jobId: jobId || null,
        description,
        date: new Date(date),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        duration,
        hourlyRate: hourlyRate || "0",
        amount: amount.toFixed(2),
        isBillable: isBillable !== false,
        isBilled: false,
        notes,
        latitude: latitude || null,
        longitude: longitude || null,
        accuracy: accuracy || null,
        address: address || null,
      }).returning();
      res.status(201).json(entry);
    } catch (error) {
      console.error("Create time entry error:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { clientId, jobId, description, date, startTime, endTime, duration, hourlyRate, isBillable, isBilled, notes, latitude, longitude, accuracy, address } = req.body;
      const amount = (duration / 3600) * (parseFloat(hourlyRate) || 0);

      const [entry] = await db
        .update(timeEntries)
        .set({
          clientId: clientId || undefined,
          jobId: jobId || undefined,
          description,
          date: new Date(date),
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          duration,
          hourlyRate: hourlyRate || "0",
          amount: amount.toFixed(2),
          isBillable,
          isBilled,
          notes,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracy: accuracy || null,
          address: address || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeEntries.id, id),
            eq(timeEntries.userId, req.session.userId!)
          )
        )
        .returning();
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Update time entry error:", error);
      res.status(500).json({ error: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db
        .delete(timeEntries)
        .where(
          and(
            eq(timeEntries.id, id),
            eq(timeEntries.userId, req.session.userId!)
          )
        );
      res.json({ success: true });
    } catch (error) {
      console.error("Delete time entry error:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // Mark time entries as billed (when adding to invoice)
  app.post("/api/time-entries/mark-billed", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { entryIds, invoiceId } = req.body;
      if (!entryIds || !Array.isArray(entryIds)) {
        return res.status(400).json({ error: "Entry IDs are required" });
      }
      for (const entryId of entryIds) {
        await db
          .update(timeEntries)
          .set({
            isBilled: true,
            invoiceId: invoiceId || null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(timeEntries.id, entryId),
              eq(timeEntries.userId, req.session.userId!)
            )
          );
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Mark time entries billed error:", error);
      res.status(500).json({ error: "Failed to mark time entries as billed" });
    }
  });

  // Get time tracking summary for dashboard
  app.get("/api/time-entries/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weekEntries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, req.session.userId!),
            gte(timeEntries.date, startOfWeek)
          )
        );

      const totalSeconds = weekEntries.reduce((sum, e) => sum + e.duration, 0);
      const billableAmount = weekEntries
        .filter(e => e.isBillable)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const unbilledCount = weekEntries.filter(e => e.isBillable && !e.isBilled).length;

      res.json({
        weeklyHours: (totalSeconds / 3600).toFixed(1),
        billableAmount: billableAmount.toFixed(2),
        unbilledEntries: unbilledCount,
      });
    } catch (error) {
      console.error("Get time entries summary error:", error);
      res.status(500).json({ error: "Failed to get time entries summary" });
    }
  });

  // Materials summary for dashboard (must be before :id route)
  app.get("/api/materials/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const { year } = req.query;
      const yearNum = parseInt(year as string) || new Date().getFullYear();
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const materialsList = await db
        .select()
        .from(materials)
        .where(
          and(
            accessCondition,
            gte(materials.date, yearStart),
            lte(materials.date, yearEnd)
          )
        );

      const totalCost = materialsList.reduce((sum, m) => sum + parseFloat(m.totalCost), 0);
      const count = materialsList.length;

      // Group by supplier
      const bySupplier: Record<string, number> = {};
      materialsList.forEach(m => {
        const sup = m.supplier || "Unknown";
        bySupplier[sup] = (bySupplier[sup] || 0) + parseFloat(m.totalCost);
      });

      res.json({
        totalCost: totalCost.toFixed(2),
        count,
        bySupplier,
      });
    } catch (error) {
      console.error("Get materials summary error:", error);
      res.status(500).json({ error: "Failed to get materials summary" });
    }
  });

  // Materials CRUD routes
  app.get("/api/materials", requireAuth, async (req: Request, res: Response) => {
    try {
      const { year, clientId, limit = "50", offset = "0" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      let conditions = [accessCondition];

      if (year) {
        const yearNum = parseInt(year as string);
        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);
        conditions.push(gte(materials.date, yearStart));
        conditions.push(lte(materials.date, yearEnd));
      }

      if (clientId) {
        conditions.push(eq(materials.clientId, parseInt(clientId as string)));
      }

      const materialsList = await db
        .select()
        .from(materials)
        .where(and(...conditions))
        .orderBy(desc(materials.date))
        .limit(limitNum)
        .offset(offsetNum);

      res.json(materialsList);
    } catch (error) {
      console.error("Get materials error:", error);
      res.status(500).json({ error: "Failed to get materials" });
    }
  });

  app.get("/api/materials/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const [material] = await db
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.id, id),
            accessCondition
          )
        )
        .limit(1);

      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Get material error:", error);
      res.status(500).json({ error: "Failed to get material" });
    }
  });

  app.post("/api/materials", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { name, description, quantity, unit, unitCost, supplier, date, clientId, invoiceId, notes } = req.body;

      if (!name || !date) {
        return res.status(400).json({ error: "Name and date are required" });
      }

      const qty = quantity !== undefined && quantity !== "" ? parseFloat(quantity) : 1;
      const cost = unitCost !== undefined && unitCost !== "" ? parseFloat(unitCost) : 0;

      if (isNaN(qty) || isNaN(cost)) {
        return res.status(400).json({ error: "Quantity and unit cost must be valid numbers" });
      }

      if (qty < 0 || cost < 0) {
        return res.status(400).json({ error: "Quantity and unit cost cannot be negative" });
      }

      const totalCost = (qty * cost).toFixed(2);

      const [material] = await db
        .insert(materials)
        .values({
          userId: req.session.userId!,
          organizationId: req.session.organizationId || null,
          name,
          description: description || null,
          quantity: qty.toString(),
          unit: unit || "each",
          unitCost: cost.toString(),
          totalCost,
          supplier: supplier || null,
          date: new Date(date),
          clientId: clientId ? parseInt(clientId) : null,
          invoiceId: invoiceId ? parseInt(invoiceId) : null,
          notes: notes || null,
        })
        .returning();

      // Log activity
      await logActivity(req, "log_material", "material", material.id, { name, totalCost });

      res.status(201).json(material);
    } catch (error) {
      console.error("Create material error:", error);
      res.status(500).json({ error: "Failed to create material" });
    }
  });

  app.put("/api/materials/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, quantity, unit, unitCost, supplier, date, clientId, invoiceId, notes } = req.body;

      const qty = quantity !== undefined && quantity !== "" ? parseFloat(quantity) : 1;
      const cost = unitCost !== undefined && unitCost !== "" ? parseFloat(unitCost) : 0;

      if (isNaN(qty) || isNaN(cost)) {
        return res.status(400).json({ error: "Quantity and unit cost must be valid numbers" });
      }

      if (qty < 0 || cost < 0) {
        return res.status(400).json({ error: "Quantity and unit cost cannot be negative" });
      }

      const totalCost = (qty * cost).toFixed(2);

      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      const [material] = await db
        .update(materials)
        .set({
          name,
          description: description || null,
          quantity: qty.toString(),
          unit: unit || "each",
          unitCost: cost.toString(),
          totalCost,
          supplier: supplier || null,
          date: date ? new Date(date) : undefined,
          clientId: clientId ? parseInt(clientId) : null,
          invoiceId: invoiceId ? parseInt(invoiceId) : null,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(materials.id, id),
            accessCondition
          )
        )
        .returning();

      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Update material error:", error);
      res.status(500).json({ error: "Failed to update material" });
    }
  });

  app.delete("/api/materials/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(materials.organizationId, req.session.organizationId)
        : eq(materials.userId, req.session.userId!);

      await db
        .delete(materials)
        .where(
          and(
            eq(materials.id, id),
            accessCondition
          )
        );
      res.json({ success: true });
    } catch (error) {
      console.error("Delete material error:", error);
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  // ============== JOBS API ==============

  app.get("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      const result = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          status: jobs.status,
          date: jobs.date,
          startTime: jobs.startTime,
          estimatedDuration: jobs.estimatedDuration,
          clientId: jobs.clientId,
          clientName: clients.name,
          clientAddress: clients.address,
          clientEircode: clients.eircode,
          clientLatitude: clients.latitude,
          clientLongitude: clients.longitude,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(accessCondition)
        .orderBy(desc(jobs.date), desc(jobs.createdAt));

      res.json(result);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Failed to get jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      const [job] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, id), accessCondition))
        .limit(1);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, job.clientId!))
        .limit(1);

      res.json({ ...job, client });
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ error: "Failed to get job" });
    }
  });

  app.post("/api/jobs", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const { clientId, title, description, date, startTime, estimatedDuration, status } = req.body;

      if (!clientId || !title) {
        return res.status(400).json({ error: "Client and Job Title are required" });
      }

      const [job] = await db
        .insert(jobs)
        .values({
          userId: req.session.userId!,
          organizationId: req.session.organizationId || null,
          clientId,
          title,
          description: description || null,
          date: date ? new Date(date) : new Date(),
          startTime: startTime || null,
          estimatedDuration: estimatedDuration || null,
          status: status || "scheduled",
        })
        .returning();

      res.status(201).json(job);
    } catch (error) {
      console.error("Create job error:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.put("/api/jobs/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { clientId, title, description, date, startTime, estimatedDuration, status } = req.body;

      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      const [job] = await db
        .update(jobs)
        .set({
          clientId,
          title,
          description,
          date: date ? new Date(date) : undefined,
          startTime,
          estimatedDuration,
          status,
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, id), accessCondition))
        .returning();

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Update job error:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      await db.delete(jobs).where(and(eq(jobs.id, id), accessCondition));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete job error:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // ============== LEGACY JOB SITES API (For backward compatibility during migration) ==============

  app.get("/api/job-sites", requireAuth, async (req: Request, res: Response) => {
    try {
      // Return jobs as job sites for compatibility
      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      const sites = await db
        .select({
          id: jobs.id,
          name: jobs.title,
          address: clients.address,
          latitude: clients.latitude,
          longitude: clients.longitude,
          radiusMeters: sql<number>`100`,
          isActive: sql<boolean>`true`,
          budgetedHours: jobs.estimatedDuration,
          notes: jobs.description,
          clientId: jobs.clientId,
          clientName: clients.name,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(accessCondition)
        .orderBy(desc(jobs.createdAt));

      res.json(sites);
    } catch (error) {
      console.error("Get job sites error:", error);
      res.status(500).json({ error: "Failed to get job sites" });
    }
  });

  app.get("/api/job-sites/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const accessCondition = req.session.organizationId
        ? eq(jobs.organizationId, req.session.organizationId)
        : eq(jobs.userId, req.session.userId!);

      const [job] = await db
        .select({
          id: jobs.id,
          name: jobs.title,
          address: clients.address,
          latitude: clients.latitude,
          longitude: clients.longitude,
          radiusMeters: sql<number>`100`,
          budgetedHours: jobs.estimatedDuration,
          notes: jobs.description,
          clientId: jobs.clientId,
          isActive: sql<boolean>`true`,
        })
        .from(jobs)
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(and(eq(jobs.id, id), accessCondition))
        .limit(1);

      if (!job) {
        return res.status(404).json({ error: "Job site not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Get job site error:", error);
      res.status(500).json({ error: "Failed to get job site" });
    }
  });

  // ============== EIRCODE GEOCODING API ==============

  // Irish Eircode routing key to area mapping for validation
  const EIRCODE_ROUTING_KEYS: Record<string, { area: string; county: string; lat: number; lng: number }> = {
    "A41": { area: "Laytown/Bettystown", county: "Meath", lat: 53.6889, lng: -6.2333 },
    "A42": { area: "Dunboyne/Ashbourne", county: "Meath", lat: 53.4242, lng: -6.4733 },
    "A45": { area: "Enfield", county: "Meath", lat: 53.4154, lng: -6.8359 },
    "A63": { area: "Dunshaughlin", county: "Meath", lat: 53.5128, lng: -6.5403 },
    "A67": { area: "Maynooth", county: "Kildare", lat: 53.3814, lng: -6.5925 },
    "A75": { area: "Celbridge", county: "Kildare", lat: 53.3392, lng: -6.5381 },
    "A81": { area: "Navan", county: "Meath", lat: 53.6528, lng: -6.6814 },
    "A82": { area: "Kells", county: "Meath", lat: 53.7267, lng: -6.8792 },
    "A83": { area: "Trim", county: "Meath", lat: 53.5550, lng: -6.7892 },
    "A84": { area: "Athboy", county: "Meath", lat: 53.6228, lng: -6.9250 },
    "A85": { area: "Oldcastle", county: "Meath", lat: 53.7667, lng: -7.1667 },
    "A86": { area: "Nobber", county: "Meath", lat: 53.8067, lng: -6.7483 },
    "A91": { area: "Drogheda", county: "Louth", lat: 53.7179, lng: -6.3561 },
    "A92": { area: "Drogheda", county: "Louth", lat: 53.7179, lng: -6.3561 },
    "C15": { area: "Dunleer/Ardee", county: "Louth", lat: 53.8311, lng: -6.3972 },
    "D01": { area: "Dublin 1", county: "Dublin", lat: 53.3508, lng: -6.2600 },
    "D02": { area: "Dublin 2", county: "Dublin", lat: 53.3382, lng: -6.2591 },
    "D03": { area: "Dublin 3", county: "Dublin", lat: 53.3667, lng: -6.2333 },
    "D04": { area: "Dublin 4", county: "Dublin", lat: 53.3233, lng: -6.2267 },
    "D05": { area: "Dublin 5", county: "Dublin", lat: 53.3833, lng: -6.1833 },
    "D06": { area: "Dublin 6", county: "Dublin", lat: 53.3167, lng: -6.2667 },
    "D07": { area: "Dublin 7", county: "Dublin", lat: 53.3567, lng: -6.2833 },
    "D08": { area: "Dublin 8", county: "Dublin", lat: 53.3350, lng: -6.2900 },
    "D09": { area: "Dublin 9", county: "Dublin", lat: 53.3800, lng: -6.2567 },
    "D10": { area: "Dublin 10", county: "Dublin", lat: 53.3433, lng: -6.3233 },
    "D11": { area: "Dublin 11", county: "Dublin", lat: 53.3900, lng: -6.2900 },
    "D12": { area: "Dublin 12", county: "Dublin", lat: 53.3233, lng: -6.3167 },
    "D13": { area: "Dublin 13", county: "Dublin", lat: 53.3967, lng: -6.1667 },
    "D14": { area: "Dublin 14", county: "Dublin", lat: 53.3000, lng: -6.2467 },
    "D15": { area: "Dublin 15", county: "Dublin", lat: 53.3900, lng: -6.3833 },
    "D16": { area: "Dublin 16", county: "Dublin", lat: 53.2833, lng: -6.2833 },
    "D17": { area: "Dublin 17", county: "Dublin", lat: 53.4000, lng: -6.1500 },
    "D18": { area: "Dublin 18", county: "Dublin", lat: 53.2667, lng: -6.1833 },
    "D20": { area: "Dublin 20", county: "Dublin", lat: 53.3500, lng: -6.3667 },
    "D22": { area: "Dublin 22", county: "Dublin", lat: 53.3167, lng: -6.3833 },
    "D24": { area: "Dublin 24", county: "Dublin", lat: 53.2833, lng: -6.3500 },
    "E21": { area: "Carlow", county: "Carlow", lat: 52.8408, lng: -6.9261 },
    "E25": { area: "Carlow", county: "Carlow", lat: 52.8408, lng: -6.9261 },
    "E32": { area: "Bagenalstown", county: "Carlow", lat: 52.7019, lng: -6.9597 },
    "E34": { area: "Tullow", county: "Carlow", lat: 52.8019, lng: -6.7372 },
    "E41": { area: "Gorey", county: "Wexford", lat: 52.6761, lng: -6.2917 },
    "E45": { area: "Enniscorthy", county: "Wexford", lat: 52.5014, lng: -6.5667 },
    "E53": { area: "Wexford", county: "Wexford", lat: 52.3361, lng: -6.4631 },
    "E91": { area: "Wicklow", county: "Wicklow", lat: 52.9808, lng: -6.0447 },
    "F12": { area: "Galway", county: "Galway", lat: 53.2707, lng: -9.0568 },
    "F23": { area: "Ballinasloe", county: "Galway", lat: 53.3306, lng: -8.2292 },
    "F26": { area: "Loughrea", county: "Galway", lat: 53.1969, lng: -8.5667 },
    "F28": { area: "Tuam", county: "Galway", lat: 53.5142, lng: -8.8561 },
    "F31": { area: "Athenry", county: "Galway", lat: 53.2967, lng: -8.7450 },
    "F35": { area: "Oranmore", county: "Galway", lat: 53.2667, lng: -8.9333 },
    "F42": { area: "Clifden", county: "Galway", lat: 53.4897, lng: -10.0200 },
    "F45": { area: "Carraroe", county: "Galway", lat: 53.2500, lng: -9.5833 },
    "F52": { area: "Ballygar", county: "Galway", lat: 53.5319, lng: -8.3331 },
    "F56": { area: "Castlebar", county: "Mayo", lat: 53.8608, lng: -9.3003 },
    "F91": { area: "Sligo", county: "Sligo", lat: 54.2697, lng: -8.4694 },
    "F92": { area: "Ballymote", county: "Sligo", lat: 54.0903, lng: -8.5111 },
    "F93": { area: "Ballina", county: "Mayo", lat: 54.1156, lng: -9.1550 },
    "F94": { area: "Westport", county: "Mayo", lat: 53.8000, lng: -9.5167 },
    "H12": { area: "Athlone", county: "Westmeath", lat: 53.4233, lng: -7.9403 },
    "H14": { area: "Mullingar", county: "Westmeath", lat: 53.5264, lng: -7.3378 },
    "H16": { area: "Ballinahown", county: "Westmeath", lat: 53.3700, lng: -7.8600 },
    "H18": { area: "Moate", county: "Westmeath", lat: 53.4000, lng: -7.7167 },
    "H23": { area: "Carrick-on-Shannon", county: "Leitrim", lat: 53.9461, lng: -8.0875 },
    "H53": { area: "Cavan", county: "Cavan", lat: 53.9908, lng: -7.3606 },
    "H54": { area: "Ballyjamesduff", county: "Cavan", lat: 53.8617, lng: -7.2028 },
    "H62": { area: "Longford", county: "Longford", lat: 53.7269, lng: -7.7992 },
    "H65": { area: "Edgeworthstown", county: "Longford", lat: 53.6942, lng: -7.5958 },
    "H71": { area: "Monaghan", county: "Monaghan", lat: 54.2494, lng: -6.9683 },
    "H91": { area: "Galway", county: "Galway", lat: 53.2707, lng: -9.0568 },
    "K32": { area: "Skerries", county: "Dublin", lat: 53.5819, lng: -6.1078 },
    "K34": { area: "Swords", county: "Dublin", lat: 53.4597, lng: -6.2181 },
    "K36": { area: "Malahide", county: "Dublin", lat: 53.4508, lng: -6.1542 },
    "K45": { area: "Naas", county: "Kildare", lat: 53.2158, lng: -6.6597 },
    "K56": { area: "Clane/Kill", county: "Kildare", lat: 53.2917, lng: -6.6875 },
    "K67": { area: "Newbridge", county: "Kildare", lat: 53.1817, lng: -6.7972 },
    "K78": { area: "Athy", county: "Kildare", lat: 52.9911, lng: -6.9819 },
    "N37": { area: "Roscommon", county: "Roscommon", lat: 53.6333, lng: -8.1833 },
    "N39": { area: "Strokestown", county: "Roscommon", lat: 53.7833, lng: -8.1000 },
    "N41": { area: "Castlerea", county: "Roscommon", lat: 53.7667, lng: -8.4833 },
    "N91": { area: "Portlaoise", county: "Laois", lat: 53.0342, lng: -7.2994 },
    "P12": { area: "Cork", county: "Cork", lat: 51.8969, lng: -8.4863 },
    "P14": { area: "Cork", county: "Cork", lat: 51.8969, lng: -8.4863 },
    "P17": { area: "Carrigaline", county: "Cork", lat: 51.8150, lng: -8.3933 },
    "P24": { area: "Bandon", county: "Cork", lat: 51.7464, lng: -8.7397 },
    "P25": { area: "Kinsale", county: "Cork", lat: 51.7058, lng: -8.5222 },
    "P31": { area: "Ballincollig", county: "Cork", lat: 51.8867, lng: -8.5833 },
    "P32": { area: "Blarney", county: "Cork", lat: 51.9333, lng: -8.5667 },
    "P36": { area: "Cobh", county: "Cork", lat: 51.8506, lng: -8.2967 },
    "P43": { area: "Midleton", county: "Cork", lat: 51.9142, lng: -8.1722 },
    "P47": { area: "Youghal", county: "Cork", lat: 51.9533, lng: -7.8500 },
    "P51": { area: "Macroom", county: "Cork", lat: 51.9050, lng: -8.9683 },
    "P56": { area: "Bantry", county: "Cork", lat: 51.6833, lng: -9.4500 },
    "P61": { area: "Mallow", county: "Cork", lat: 52.1333, lng: -8.6500 },
    "P67": { area: "Fermoy", county: "Cork", lat: 52.1383, lng: -8.2750 },
    "P72": { area: "Mitchelstown", county: "Cork", lat: 52.2650, lng: -8.2683 },
    "P75": { area: "Charleville", county: "Cork", lat: 52.3500, lng: -8.6833 },
    "P81": { area: "Skibbereen", county: "Cork", lat: 51.5556, lng: -9.2611 },
    "P85": { area: "Clonakilty", county: "Cork", lat: 51.6233, lng: -8.8872 },
    "R14": { area: "Bray", county: "Wicklow", lat: 53.2028, lng: -6.0983 },
    "R21": { area: "Arklow", county: "Wicklow", lat: 52.7944, lng: -6.1611 },
    "R32": { area: "Portarlington", county: "Laois", lat: 53.1622, lng: -7.1889 },
    "R35": { area: "Tullamore", county: "Offaly", lat: 53.2742, lng: -7.4883 },
    "R42": { area: "Birr", county: "Offaly", lat: 53.0978, lng: -7.9100 },
    "R45": { area: "Banagher", county: "Offaly", lat: 53.1917, lng: -7.9833 },
    "R51": { area: "Tipperary", county: "Tipperary", lat: 52.4744, lng: -8.1558 },
    "R56": { area: "Nenagh", county: "Tipperary", lat: 52.8636, lng: -8.1967 },
    "R65": { area: "Mountmellick", county: "Laois", lat: 53.1119, lng: -7.5336 },
    "R93": { area: "Carlow", county: "Carlow", lat: 52.8408, lng: -6.9261 },
    "R95": { area: "Kilkenny", county: "Kilkenny", lat: 52.6541, lng: -7.2448 },
    "T12": { area: "Cork", county: "Cork", lat: 51.8969, lng: -8.4863 },
    "T23": { area: "Cork", county: "Cork", lat: 51.8969, lng: -8.4863 },
    "T34": { area: "Killarney", county: "Kerry", lat: 52.0594, lng: -9.5047 },
    "T45": { area: "Tralee", county: "Kerry", lat: 52.2711, lng: -9.6992 },
    "T56": { area: "Listowel", county: "Kerry", lat: 52.4453, lng: -9.4833 },
    "V14": { area: "Limerick", county: "Limerick", lat: 52.6680, lng: -8.6267 },
    "V15": { area: "Castletroy", county: "Limerick", lat: 52.6733, lng: -8.5500 },
    "V23": { area: "Adare", county: "Limerick", lat: 52.5642, lng: -8.7881 },
    "V31": { area: "Newcastle West", county: "Limerick", lat: 52.4492, lng: -9.0611 },
    "V35": { area: "Abbeyfeale", county: "Limerick", lat: 52.3833, lng: -9.3000 },
    "V42": { area: "Shannon", county: "Clare", lat: 52.7033, lng: -8.8600 },
    "V92": { area: "Tralee", county: "Kerry", lat: 52.2711, lng: -9.6992 },
    "V93": { area: "Killarney", county: "Kerry", lat: 52.0594, lng: -9.5047 },
    "V94": { area: "Limerick", county: "Limerick", lat: 52.6680, lng: -8.6267 },
    "V95": { area: "Limerick", county: "Limerick", lat: 52.6680, lng: -8.6267 },
    "W12": { area: "Bray", county: "Wicklow", lat: 53.2028, lng: -6.0983 },
    "W23": { area: "Blessington", county: "Wicklow", lat: 53.1719, lng: -6.5339 },
    "W34": { area: "Greystones", county: "Wicklow", lat: 53.1439, lng: -6.0631 },
    "W91": { area: "Waterford", county: "Waterford", lat: 52.2593, lng: -7.1128 },
    "X35": { area: "Cashel", county: "Tipperary", lat: 52.5167, lng: -7.8833 },
    "X42": { area: "Dungarvan", county: "Waterford", lat: 52.0894, lng: -7.6197 },
    "X91": { area: "Wexford", county: "Wexford", lat: 52.3361, lng: -6.4631 },
    "Y14": { area: "New Ross", county: "Wexford", lat: 52.3964, lng: -6.9361 },
    "Y21": { area: "Waterford", county: "Waterford", lat: 52.2593, lng: -7.1128 },
    "Y25": { area: "Clonmel", county: "Tipperary", lat: 52.3553, lng: -7.7036 },
    "Y34": { area: "New Ross", county: "Wexford", lat: 52.3964, lng: -6.9361 },
    "Y35": { area: "Wexford", county: "Wexford", lat: 52.3361, lng: -6.4631 },
  };



  // Google Places Autocomplete endpoint
  app.get("/api/places/autocomplete", requireAuth, async (req: Request, res: Response) => {
    try {
      const { query, country = "ie" } = req.query;

      if (!query || typeof query !== "string" || query.length < 3) {
        return res.json({ predictions: [] });
      }

      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        console.log("Google Maps API key not configured");
        return res.json({ predictions: [] });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:${country}&types=address&key=${googleApiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.predictions) {
        res.json({
          predictions: data.predictions.map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
            structured_formatting: p.structured_formatting,
          })),
        });
      } else if (data.status === "REQUEST_DENIED") {
        console.log("Google Places API request denied:", data.error_message);
        res.json({ predictions: [] });
      } else {
        res.json({ predictions: [] });
      }
    } catch (error) {
      console.error("Places autocomplete error:", error);
      res.status(500).json({ error: "Failed to get address suggestions" });
    }
  });

  // Google Place Details endpoint
  app.get("/api/places/details", requireAuth, async (req: Request, res: Response) => {
    try {
      const { place_id } = req.query;

      if (!place_id || typeof place_id !== "string") {
        return res.status(400).json({ error: "Place ID is required" });
      }

      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        return res.status(503).json({ error: "Google Maps API not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=formatted_address,geometry,address_components&key=${googleApiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const result = data.result;
        const addressComponents = result.address_components || [];

        // Extract address parts
        let streetNumber = "";
        let route = "";
        let locality = "";
        let county = "";
        let country = "";
        let postalCode = "";

        for (const component of addressComponents) {
          const types = component.types || [];
          if (types.includes("street_number")) {
            streetNumber = component.long_name;
          } else if (types.includes("route")) {
            route = component.long_name;
          } else if (types.includes("locality") || types.includes("postal_town")) {
            locality = component.long_name;
          } else if (types.includes("administrative_area_level_1")) {
            county = component.long_name.replace("County ", "");
          } else if (types.includes("country")) {
            country = component.long_name;
          } else if (types.includes("postal_code")) {
            postalCode = component.long_name;
          }
        }

        res.json({
          formattedAddress: result.formatted_address,
          streetAddress: [streetNumber, route].filter(Boolean).join(" ") || null,
          locality: locality || null,
          county: county || null,
          country: country || null,
          eircode: postalCode || null,
          latitude: result.geometry?.location?.lat || null,
          longitude: result.geometry?.location?.lng || null,
          placeId: place_id,
        });
      } else {
        res.status(404).json({ error: "Place not found" });
      }
    } catch (error) {
      console.error("Place details error:", error);
      res.status(500).json({ error: "Failed to get place details" });
    }
  });

  // ============== CLOCK ENTRIES API ==============

  // Helper function to calculate distance between two GPS coordinates (in meters)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  app.get("/api/clock-entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, userId: filterUserId, jobId, limit = "50", offset = "0" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const accessCondition = req.session.organizationId
        ? eq(clockEntries.organizationId, req.session.organizationId)
        : eq(clockEntries.userId, req.session.userId!);

      let conditions = [accessCondition];

      if (startDate) {
        conditions.push(gte(clockEntries.clockInTime, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(clockEntries.clockInTime, new Date(endDate as string)));
      }
      if (filterUserId) {
        conditions.push(eq(clockEntries.userId, filterUserId as string));
      }
      if (jobId) {
        conditions.push(eq(clockEntries.jobId, parseInt(jobId as string)));
      }

      const entries = await db
        .select({
          id: clockEntries.id,
          userId: clockEntries.userId,
          userEmail: users.email,
          jobId: clockEntries.jobId,
          jobTitle: jobs.title,
          clientName: clients.name,
          clockInTime: clockEntries.clockInTime,
          clockOutTime: clockEntries.clockOutTime,
          clockInLatitude: clockEntries.clockInLatitude,
          clockInLongitude: clockEntries.clockInLongitude,
          clockOutLatitude: clockEntries.clockOutLatitude,
          clockOutLongitude: clockEntries.clockOutLongitude,
          clockInDistanceMeters: clockEntries.clockInDistanceMeters,
          clockOutDistanceMeters: clockEntries.clockOutDistanceMeters,
          clockInVerified: clockEntries.clockInVerified,
          clockOutVerified: clockEntries.clockOutVerified,
          totalMinutes: clockEntries.totalMinutes,
          breakMinutes: clockEntries.breakMinutes,
          billableMinutes: clockEntries.billableMinutes,
          notes: clockEntries.notes,
          adminNotes: clockEntries.adminNotes,
          status: clockEntries.status,
          createdAt: clockEntries.createdAt,
        })
        .from(clockEntries)
        .leftJoin(users, eq(users.id, clockEntries.userId))
        .leftJoin(jobs, eq(jobs.id, clockEntries.jobId))
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(and(...conditions))
        .orderBy(desc(clockEntries.clockInTime))
        .limit(limitNum)
        .offset(offsetNum);

      res.json(entries);
    } catch (error) {
      console.error("Get clock entries error:", error);
      res.status(500).json({ error: "Failed to get clock entries" });
    }
  });

  // Workforce KPIs - Employee performance metrics
  app.get("/api/workforce/kpis", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;

      // Get all organization members
      const members = await db
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          email: users.email,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, "active")
        ));

      // Get user profiles for names
      const memberUserIds = members.map(m => m.userId);
      const profiles = await db
        .select({
          userId: userProfiles.userId,
          businessOwnerName: userProfiles.businessOwnerName,
        })
        .from(userProfiles)
        .where(sql`${userProfiles.userId} = ANY(${memberUserIds})`);

      const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

      // Get clock entries for the org's job sites (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const orgJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.organizationId, orgId));
      const jobIds = orgJobs.map(j => j.id);

      const clockStats = jobIds.length > 0 ? await db
        .select({
          userId: clockEntries.userId,
          totalMinutes: sql<number>`COALESCE(SUM(${clockEntries.totalMinutes}), 0)`,
          billableMinutes: sql<number>`COALESCE(SUM(${clockEntries.billableMinutes}), 0)`,
          clockInCount: sql<number>`COUNT(*)`,
          verifiedCount: sql<number>`SUM(CASE WHEN ${clockEntries.clockInVerified} = true THEN 1 ELSE 0 END)`,
          jobCount: sql<number>`COUNT(DISTINCT ${clockEntries.jobId})`,
        })
        .from(clockEntries)
        .where(and(
          sql`${clockEntries.jobId} = ANY(${jobIds})`,
          sql`${clockEntries.clockInTime} >= ${thirtyDaysAgo.toISOString()}`,
          sql`${clockEntries.clockOutTime} IS NOT NULL`
        ))
        .groupBy(clockEntries.userId) : [];

      const clockStatsMap = Object.fromEntries(clockStats.map(s => [s.userId, s]));

      // Get time entries for additional hours
      const timeStats = await db
        .select({
          userId: timeEntries.userId,
          totalDuration: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)`,
          billableAmount: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} = true THEN ${timeEntries.amount} ELSE 0 END), 0)`,
        })
        .from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, orgId),
          sql`${timeEntries.date} >= ${thirtyDaysAgo.toISOString()}`
        ))
        .groupBy(timeEntries.userId);

      const timeStatsMap = Object.fromEntries(timeStats.map(s => [s.userId, s]));

      // Calculate KPIs for each member
      const kpis = members.map(member => {
        const profile = profileMap[member.userId];
        const memberName = profile?.businessOwnerName || member.email.split("@")[0];

        const clockData = clockStatsMap[member.userId] || {
          totalMinutes: 0, billableMinutes: 0, clockInCount: 0, verifiedCount: 0, jobCount: 0
        };
        const timeData = timeStatsMap[member.userId] || { totalDuration: 0, billableAmount: 0 };

        const clockHours = Number(clockData.totalMinutes) / 60;
        const manualHours = Number(timeData.totalDuration) / 3600;
        const totalHours = clockHours + manualHours;
        const billableHours = (Number(clockData.billableMinutes) / 60) + manualHours;

        // Overtime calculation (assuming 40 hour work week, prorated for 30 days)
        const expectedHours = (40 * 30 / 7); // ~171 hours over 30 days
        const overtimeHours = Math.max(0, totalHours - expectedHours);

        return {
          memberId: member.id,
          memberName,
          email: member.email,
          role: member.role,
          jobCount: Number(clockData.jobCount),
          totalHours: Number(totalHours.toFixed(1)),
          verifiedClockIns: Number(clockData.verifiedCount),
          totalClockIns: Number(clockData.clockInCount),
          billableHours: Number(billableHours.toFixed(1)),
          overtimeHours: Number(overtimeHours.toFixed(1)),
          revenueContribution: Number(timeData.billableAmount) || 0,
        };
      });

      // Sort by total hours descending
      kpis.sort((a, b) => b.totalHours - a.totalHours);

      res.json(kpis);
    } catch (error) {
      console.error("Get workforce KPIs error:", error);
      res.status(500).json({ error: "Failed to get workforce KPIs" });
    }
  });

  // Get current active clock-in for the logged-in user
  app.get("/api/clock-entries/active", requireAuth, async (req: Request, res: Response) => {
    try {
      const [activeEntry] = await db
        .select({
          id: clockEntries.id,
          jobId: clockEntries.jobId,
          jobTitle: jobs.title,
          clientName: clients.name,
          clientAddress: clients.address,
          clockInTime: clockEntries.clockInTime,
          clockInVerified: clockEntries.clockInVerified,
          clockInDistanceMeters: clockEntries.clockInDistanceMeters,
          clockInAccuracy: clockEntries.clockInAccuracy,
          workDescription: clockEntries.workDescription,
          notes: clockEntries.notes,
        })
        .from(clockEntries)
        .leftJoin(jobs, eq(jobs.id, clockEntries.jobId))
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(
          and(
            eq(clockEntries.userId, req.session.userId!),
            sql`${clockEntries.clockOutTime} IS NULL`
          )
        )
        .limit(1);

      res.json(activeEntry || null);
    } catch (error) {
      console.error("Get active clock entry error:", error);
      res.status(500).json({ error: "Failed to get active clock entry" });
    }
  });

  // Clock in
  app.post("/api/clock-entries/clock-in", requireAuth, async (req: Request, res: Response) => {
    try {
      const { jobId, latitude, longitude, accuracy, notes, workDescription } = req.body;

      if (!jobId) {
        return res.status(400).json({ error: "Job ID is required" });
      }

      // Check if user already has an active clock-in
      const [existingActive] = await db
        .select()
        .from(clockEntries)
        .where(
          and(
            eq(clockEntries.userId, req.session.userId!),
            sql`${clockEntries.clockOutTime} IS NULL`
          )
        )
        .limit(1);

      if (existingActive) {
        return res.status(400).json({ error: "You are already clocked in. Please clock out first." });
      }

      // Get job and associated client to verify location
      const [jobData] = await db
        .select({
          job: jobs,
          client: clients
        })
        .from(jobs)
        .innerJoin(clients, eq(clients.id, jobs.clientId))
        .where(eq(jobs.id, parseInt(jobId)))
        .limit(1);

      if (!jobData) {
        return res.status(404).json({ error: "Job not found" });
      }

      const { job, client } = jobData;

      let clockInDistanceMeters: number | null = null;
      let clockInVerified = false;

      if (latitude && longitude && client.latitude && client.longitude) {
        clockInDistanceMeters = Math.round(calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(client.latitude),
          parseFloat(client.longitude)
        ));

        // Allow clock-in if within 100 meters (standard geofence)
        if (clockInDistanceMeters <= 100) {
          clockInVerified = true;
        }
      }

      const [entry] = await db
        .insert(clockEntries)
        .values({
          userId: req.session.userId!,
          organizationId: req.session.organizationId || null,
          jobId: parseInt(jobId),
          clockInTime: new Date(),
          clockInLatitude: latitude ? latitude.toString() : null,
          clockInLongitude: longitude ? longitude.toString() : null,
          clockInAccuracy: accuracy ? accuracy.toString() : null,
          clockInDistanceMeters,
          clockInVerified,
          workDescription: workDescription || null,
          notes: notes || null,
          status: "active",
        })
        .returning();

      res.status(201).json(entry);
    } catch (error) {
      console.error("Clock in error:", error);
      res.status(500).json({ error: "Failed to clock in" });
    }
  });

  // Clock out
  app.post("/api/clock-entries/clock-out", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, latitude, longitude, accuracy, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Clock entry ID is required" });
      }

      const [existing] = await db
        .select()
        .from(clockEntries)
        .where(and(eq(clockEntries.id, parseInt(id)), eq(clockEntries.userId, req.session.userId!)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Clock entry not found" });
      }

      if (existing.clockOutTime) {
        return res.status(400).json({ error: "You are already clocked out for this entry" });
      }

      // Check if there's an active break - end it first
      const [activeBreak] = await db
        .select()
        .from(clockEntryBreaks)
        .where(
          and(
            eq(clockEntryBreaks.clockEntryId, existing.id),
            sql`${clockEntryBreaks.breakEnd} IS NULL`
          )
        )
        .limit(1);

      if (activeBreak) {
        const breakEnd = new Date();
        const durationMinutes = Math.round((breakEnd.getTime() - new Date(activeBreak.breakStart).getTime()) / 60000);
        await db
          .update(clockEntryBreaks)
          .set({ breakEnd, durationMinutes })
          .where(eq(clockEntryBreaks.id, activeBreak.id));
      }

      let clockOutDistanceMeters: number | null = null;
      let clockOutVerified = false;

      // Get job and associated client to verify location
      const [jobData] = await db
        .select({
          job: jobs,
          client: clients
        })
        .from(jobs)
        .innerJoin(clients, eq(clients.id, jobs.clientId))
        .where(eq(jobs.id, existing.jobId!))
        .limit(1);

      if (latitude && longitude && jobData?.client.latitude && jobData?.client.longitude) {
        clockOutDistanceMeters = Math.round(calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(jobData.client.latitude),
          parseFloat(jobData.client.longitude)
        ));

        if (clockOutDistanceMeters <= 100) {
          clockOutVerified = true;
        }
      }

      const clockOutTime = new Date();
      const totalMinutes = Math.round((clockOutTime.getTime() - new Date(existing.clockInTime).getTime()) / 60000);

      // Calculate total break minutes
      const breaks = await db
        .select()
        .from(clockEntryBreaks)
        .where(eq(clockEntryBreaks.clockEntryId, existing.id));

      const breakMinutes = breaks.reduce((total, b) => total + (b.durationMinutes || 0), 0);
      const billableMinutes = Math.max(0, totalMinutes - breakMinutes);

      const [updated] = await db
        .update(clockEntries)
        .set({
          clockOutTime,
          clockOutLatitude: latitude ? latitude.toString() : null,
          clockOutLongitude: longitude ? longitude.toString() : null,
          clockOutAccuracy: accuracy ? accuracy.toString() : null,
          clockOutDistanceMeters,
          clockOutVerified,
          totalMinutes,
          breakMinutes,
          billableMinutes,
          notes: notes || existing.notes,
          status: "completed",
        })
        .where(eq(clockEntries.id, existing.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Clock out error:", error);
      res.status(500).json({ error: "Failed to clock out" });
    }
  });

  // Start break
  app.post("/api/clock-entries/break/start", requireAuth, async (req: Request, res: Response) => {
    try {
      // Find active clock-in
      const [activeEntry] = await db
        .select()
        .from(clockEntries)
        .where(
          and(
            eq(clockEntries.userId, req.session.userId!),
            sql`${clockEntries.clockOutTime} IS NULL`
          )
        )
        .limit(1);

      if (!activeEntry) {
        return res.status(400).json({ error: "You are not currently clocked in" });
      }

      // Check if already on break
      const [activeBreak] = await db
        .select()
        .from(clockEntryBreaks)
        .where(
          and(
            eq(clockEntryBreaks.clockEntryId, activeEntry.id),
            sql`${clockEntryBreaks.breakEnd} IS NULL`
          )
        )
        .limit(1);

      if (activeBreak) {
        return res.status(400).json({ error: "You are already on break" });
      }

      const [newBreak] = await db
        .insert(clockEntryBreaks)
        .values({
          clockEntryId: activeEntry.id,
          breakStart: new Date(),
        })
        .returning();

      res.status(201).json({
        ...newBreak,
        message: "Break started"
      });
    } catch (error) {
      console.error("Start break error:", error);
      res.status(500).json({ error: "Failed to start break" });
    }
  });

  // End break
  app.post("/api/clock-entries/break/end", requireAuth, async (req: Request, res: Response) => {
    try {
      // Find active clock-in
      const [activeEntry] = await db
        .select()
        .from(clockEntries)
        .where(
          and(
            eq(clockEntries.userId, req.session.userId!),
            sql`${clockEntries.clockOutTime} IS NULL`
          )
        )
        .limit(1);

      if (!activeEntry) {
        return res.status(400).json({ error: "You are not currently clocked in" });
      }

      // Find active break
      const [activeBreak] = await db
        .select()
        .from(clockEntryBreaks)
        .where(
          and(
            eq(clockEntryBreaks.clockEntryId, activeEntry.id),
            sql`${clockEntryBreaks.breakEnd} IS NULL`
          )
        )
        .limit(1);

      if (!activeBreak) {
        return res.status(400).json({ error: "You are not currently on break" });
      }

      const breakEnd = new Date();
      const durationMinutes = Math.round((breakEnd.getTime() - new Date(activeBreak.breakStart).getTime()) / 60000);

      const [endedBreak] = await db
        .update(clockEntryBreaks)
        .set({ breakEnd, durationMinutes })
        .where(eq(clockEntryBreaks.id, activeBreak.id))
        .returning();

      res.json({
        ...endedBreak,
        message: `Break ended. Duration: ${durationMinutes} minutes`
      });
    } catch (error) {
      console.error("End break error:", error);
      res.status(500).json({ error: "Failed to end break" });
    }
  });

  // Get breaks for active entry
  app.get("/api/clock-entries/breaks", requireAuth, async (req: Request, res: Response) => {
    try {
      // Find active clock-in
      const [activeEntry] = await db
        .select()
        .from(clockEntries)
        .where(
          and(
            eq(clockEntries.userId, req.session.userId!),
            sql`${clockEntries.clockOutTime} IS NULL`
          )
        )
        .limit(1);

      if (!activeEntry) {
        return res.json({ breaks: [], activeBreak: null });
      }

      const breaks = await db
        .select()
        .from(clockEntryBreaks)
        .where(eq(clockEntryBreaks.clockEntryId, activeEntry.id))
        .orderBy(clockEntryBreaks.breakStart);

      const activeBreak = breaks.find(b => b.breakEnd === null) || null;

      res.json({ breaks, activeBreak });
    } catch (error) {
      console.error("Get breaks error:", error);
      res.status(500).json({ error: "Failed to get breaks" });
    }
  });

  // Admin: Update clock entry status/notes
  app.put("/api/clock-entries/:id", requireAuth, canManage, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes, totalMinutes } = req.body;

      const accessCondition = req.session.organizationId
        ? eq(clockEntries.organizationId, req.session.organizationId)
        : eq(clockEntries.userId, req.session.userId!);

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (totalMinutes !== undefined) updateData.totalMinutes = parseInt(totalMinutes);

      const [entry] = await db
        .update(clockEntries)
        .set(updateData)
        .where(and(eq(clockEntries.id, id), accessCondition))
        .returning();

      if (!entry) {
        return res.status(404).json({ error: "Clock entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Update clock entry error:", error);
      res.status(500).json({ error: "Failed to update clock entry" });
    }
  });

  // Get time summary for a worker or all workers
  app.get("/api/clock-entries/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, userId: filterUserId } = req.query;

      const accessCondition = req.session.organizationId
        ? eq(clockEntries.organizationId, req.session.organizationId)
        : eq(clockEntries.userId, req.session.userId!);

      let conditions = [accessCondition];

      if (startDate) {
        conditions.push(gte(clockEntries.clockInTime, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(clockEntries.clockInTime, new Date(endDate as string)));
      }
      if (filterUserId) {
        conditions.push(eq(clockEntries.userId, filterUserId as string));
      }

      const entries = await db
        .select({
          userId: clockEntries.userId,
          userEmail: users.email,
          totalMinutes: clockEntries.totalMinutes,
          clockInVerified: clockEntries.clockInVerified,
          clockOutVerified: clockEntries.clockOutVerified,
          status: clockEntries.status,
        })
        .from(clockEntries)
        .leftJoin(users, eq(users.id, clockEntries.userId))
        .where(and(...conditions, sql`${clockEntries.clockOutTime} IS NOT NULL`));

      // Aggregate by user
      const byUser: Record<string, {
        email: string;
        totalMinutes: number;
        approvedMinutes: number;
        flaggedMinutes: number;
        entryCount: number;
        flaggedCount: number;
      }> = {};

      entries.forEach(e => {
        if (!byUser[e.userId]) {
          byUser[e.userId] = {
            email: e.userEmail || "Unknown",
            totalMinutes: 0,
            approvedMinutes: 0,
            flaggedMinutes: 0,
            entryCount: 0,
            flaggedCount: 0
          };
        }
        const mins = e.totalMinutes || 0;
        byUser[e.userId].totalMinutes += mins;
        byUser[e.userId].entryCount += 1;
        if (e.status === "approved") {
          byUser[e.userId].approvedMinutes += mins;
        } else if (e.status === "flagged") {
          byUser[e.userId].flaggedMinutes += mins;
          byUser[e.userId].flaggedCount += 1;
        }
      });

      const summary = Object.entries(byUser).map(([userId, data]) => ({
        userId,
        email: data.email,
        totalHours: (data.totalMinutes / 60).toFixed(2),
        approvedHours: (data.approvedMinutes / 60).toFixed(2),
        flaggedHours: (data.flaggedMinutes / 60).toFixed(2),
        entryCount: data.entryCount,
        flaggedCount: data.flaggedCount,
      }));

      res.json(summary);
    } catch (error) {
      console.error("Get clock summary error:", error);
      res.status(500).json({ error: "Failed to get clock summary" });
    }
  });

  app.get("/api/organizations", requireAuth, async (req: Request, res: Response) => {
    try {
      const memberships = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          role: organizationMembers.role,
          createdAt: organizations.createdAt,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(and(eq(organizationMembers.userId, req.session.userId!), eq(organizationMembers.status, "active")));
      res.json(memberships);
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({ error: "Failed to get organizations" });
    }
  });

  app.post("/api/organizations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      const orgCode = await generateUniqueOrgCode();
      const [org] = await db.insert(organizations).values({
        code: orgCode,
        name: name.trim(),
        createdBy: req.session.userId!,
      }).returning();

      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: req.session.userId!,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      });

      res.status(201).json(org);
    } catch (error) {
      console.error("Create organization error:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.post("/api/organizations/switch", requireAuth, async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.body;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, req.session.userId!),
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.status, "active")
          )
        )
        .limit(1);

      if (!membership) {
        return res.status(403).json({ error: "You are not a member of this organization" });
      }

      req.session.organizationId = organizationId;
      req.session.organizationRole = membership.role;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);

      res.json({ organizationId, role: membership.role, name: org?.name });
    } catch (error) {
      console.error("Switch organization error:", error);
      res.status(500).json({ error: "Failed to switch organization" });
    }
  });

  // Simplified team management routes (use session's organizationId)
  app.get("/api/organizations/members", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;

      const members = await db
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          status: organizationMembers.status,
          joinedAt: organizationMembers.joinedAt,
          user: {
            email: users.email,
          },
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, orgId));

      res.json(members);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ error: "Failed to get organization members" });
    }
  });

  app.get("/api/organizations/invitations", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;

      const invitations = await db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.organizationId, orgId),
            eq(organizationInvitations.status, "pending")
          )
        )
        .orderBy(desc(organizationInvitations.createdAt));

      res.json(invitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({ error: "Failed to get invitations" });
    }
  });

  app.post("/api/organizations/invite", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { email, role } = req.body;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const validRoles = ["admin", "staff", "viewer"];
      const inviteRole = validRoles.includes(role) ? role : "staff";

      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

      if (existingUser) {
        const [existingMember] = await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, existingUser.id),
              eq(organizationMembers.organizationId, orgId)
            )
          )
          .limit(1);

        if (existingMember) {
          return res.status(400).json({ error: "User is already a member of this organization" });
        }
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invitation] = await db.insert(organizationInvitations).values({
        organizationId: orgId,
        email: email.toLowerCase(),
        role: inviteRole,
        token,
        invitedBy: req.session.userId!,
        expiresAt,
        status: "pending",
      }).returning();

      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const [inviter] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);

      await sendTeamInviteEmail(
        email.toLowerCase(),
        org?.name || "Your Team",
        inviter?.email || "A team member",
        inviteRole,
        token
      );

      res.status(201).json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error("Send invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.put("/api/organizations/members/:memberId/role", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;

      const validRoles = ["admin", "staff", "viewer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be admin, staff, or viewer" });
      }

      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
        .limit(1);

      if (!existingMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (existingMember.role === "owner") {
        return res.status(403).json({ error: "Cannot change the role of an owner" });
      }

      const [updated] = await db
        .update(organizationMembers)
        .set({ role })
        .where(eq(organizationMembers.id, memberId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Update member role error:", error);
      res.status(500).json({ error: "Failed to update member role" });
    }
  });

  app.delete("/api/organizations/members/:memberId", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const memberId = parseInt(req.params.memberId);

      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
        .limit(1);

      if (!existingMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (existingMember.role === "owner") {
        return res.status(403).json({ error: "Cannot remove an owner from the organization" });
      }

      if (existingMember.userId === req.session.userId) {
        return res.status(403).json({ error: "Cannot remove yourself. Use leave organization instead." });
      }

      await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.delete("/api/organizations/invitations/:invitationId", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const invitationId = parseInt(req.params.invitationId);

      const [invitation] = await db
        .select()
        .from(organizationInvitations)
        .where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.organizationId, orgId)))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      await db.delete(organizationInvitations).where(eq(organizationInvitations.id, invitationId));

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel invitation error:", error);
      res.status(500).json({ error: "Failed to cancel invitation" });
    }
  });

  app.get("/api/organizations/:id/members", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot view members of other organizations" });
      }

      const members = await db
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          status: organizationMembers.status,
          joinedAt: organizationMembers.joinedAt,
          email: users.email,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, orgId));

      res.json(members);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ error: "Failed to get organization members" });
    }
  });

  app.put("/api/organizations/:id/members/:memberId", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;

      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot modify members of other organizations" });
      }

      const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
      const isOwner = req.session.organizationRole === "owner";
      const isSuperAdmin = currentUser?.isSuperAdmin === true;

      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({ error: "Only organization owner or super admin can change member roles" });
      }

      const validRoles = ["admin", "staff", "viewer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be admin, staff, or viewer" });
      }

      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
        .limit(1);

      if (!existingMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (existingMember.role === "owner") {
        return res.status(403).json({ error: "Cannot change the role of an owner" });
      }

      const [updated] = await db
        .update(organizationMembers)
        .set({ role })
        .where(eq(organizationMembers.id, memberId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Update member role error:", error);
      res.status(500).json({ error: "Failed to update member role" });
    }
  });

  app.delete("/api/organizations/:id/members/:memberId", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);

      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot modify members of other organizations" });
      }

      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
        .limit(1);

      if (!existingMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (existingMember.role === "owner") {
        return res.status(403).json({ error: "Cannot remove an owner from the organization" });
      }

      if (existingMember.userId === req.session.userId) {
        return res.status(403).json({ error: "Cannot remove yourself. Use leave organization instead." });
      }

      await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.post("/api/organizations/:id/invitations", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const { email, role } = req.body;

      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot invite to other organizations" });
      }

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
      const isOwner = req.session.organizationRole === "owner";
      const isSuperAdmin = currentUser?.isSuperAdmin === true;

      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({ error: "Only organization owner or super admin can invite members" });
      }

      const validRoles = ["admin", "staff", "viewer"];
      const inviteRole = validRoles.includes(role) ? role : "staff";

      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

      if (existingUser) {
        const [existingMember] = await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, existingUser.id),
              eq(organizationMembers.organizationId, orgId)
            )
          )
          .limit(1);

        if (existingMember) {
          return res.status(400).json({ error: "User is already a member of this organization" });
        }
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invitation] = await db.insert(organizationInvitations).values({
        organizationId: orgId,
        email: email.toLowerCase(),
        role: inviteRole,
        token,
        invitedBy: req.session.userId!,
        expiresAt,
        status: "pending",
      }).returning();

      res.status(201).json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteLink: `/invite/${token}`
      });
    } catch (error) {
      console.error("Create invitation error:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/organizations/:id/invitations", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);

      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot view invitations of other organizations" });
      }

      const invitations = await db
        .select()
        .from(organizationInvitations)
        .where(and(eq(organizationInvitations.organizationId, orgId), eq(organizationInvitations.status, "pending")));

      res.json(invitations);
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({ error: "Failed to get invitations" });
    }
  });

  app.post("/api/invitations/:token/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const [invitation] = await db
        .select()
        .from(organizationInvitations)
        .where(and(eq(organizationInvitations.token, token), eq(organizationInvitations.status, "pending")))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found or already used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await db.update(organizationInvitations).set({ status: "expired" }).where(eq(organizationInvitations.id, invitation.id));
        return res.status(400).json({ error: "Invitation has expired" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);

      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation was sent to a different email address" });
      }

      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, req.session.userId!),
            eq(organizationMembers.organizationId, invitation.organizationId)
          )
        )
        .limit(1);

      if (existingMember) {
        await db.update(organizationInvitations).set({ status: "accepted" }).where(eq(organizationInvitations.id, invitation.id));
        return res.status(400).json({ error: "You are already a member of this organization" });
      }

      await db.insert(organizationMembers).values({
        organizationId: invitation.organizationId,
        userId: req.session.userId!,
        role: invitation.role,
        status: "active",
        invitedBy: invitation.invitedBy,
        joinedAt: new Date(),
      });

      await db.update(organizationInvitations).set({ status: "accepted" }).where(eq(organizationInvitations.id, invitation.id));

      req.session.organizationId = invitation.organizationId;
      req.session.organizationRole = invitation.role;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, invitation.organizationId)).limit(1);

      res.json({
        success: true,
        organizationId: invitation.organizationId,
        organizationName: org?.name,
        role: invitation.role
      });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.delete("/api/invitations/:id", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const invId = parseInt(req.params.id);

      const [invitation] = await db
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, invId))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      if (invitation.organizationId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot delete invitations from other organizations" });
      }

      await db.delete(organizationInvitations).where(eq(organizationInvitations.id, invId));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete invitation error:", error);
      res.status(500).json({ error: "Failed to delete invitation" });
    }
  });

  app.put("/api/organizations/:id", requireAuth, requireOrganization, canOwn, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const { name } = req.body;

      if (orgId !== req.session.organizationId) {
        return res.status(403).json({ error: "Cannot update other organizations" });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      const [updated] = await db
        .update(organizations)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(eq(organizations.id, orgId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Update organization error:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Stripe Payment Routes

  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Get Stripe publishable key error:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  app.post("/api/invoices/:id/payment-link", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);

      const [invoice] = await db.select().from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, req.session.userId!)
        ))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ error: "Invoice is already paid" });
      }

      const [client] = await db.select().from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(parseFloat(invoice.total) * 100);

      const publicToken = invoice.publicToken || crypto.randomBytes(32).toString('hex');

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: client?.name ? `Invoice for ${client.name}` : undefined,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/api/public/invoice/${publicToken}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/public/invoice/${publicToken}`,
        customer_email: client?.email || undefined,
        metadata: {
          invoiceId: invoiceId.toString(),
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      await db.update(invoices)
        .set({
          stripeCheckoutSessionId: session.id,
          stripePaymentLink: session.url,
          publicToken,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      res.json({
        paymentLink: session.url,
        publicToken,
        publicUrl: `${baseUrl}/api/public/invoice/${publicToken}`,
      });
    } catch (error) {
      console.error("Create payment link error:", error);
      res.status(500).json({ error: "Failed to create payment link" });
    }
  });

  app.get("/api/public/invoice/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const [invoice] = await db.select().from(invoices)
        .where(eq(invoices.publicToken, token))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const [client] = await db.select().from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      const items = await db.select().from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));

      const [profile] = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, invoice.userId))
        .limit(1);

      res.json({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          vatRate: invoice.vatRate,
          vatAmount: invoice.vatAmount,
          total: invoice.total,
          status: invoice.status,
          paidAmount: invoice.paidAmount,
          paidDate: invoice.paidDate,
          paymentMethod: invoice.paymentMethod,
          paymentInfo: invoice.paymentInfo,
          notes: invoice.notes,
          stripePaymentLink: invoice.stripePaymentLink,
        },
        client: client ? {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          taxNumber: client.taxNumber,
        } : null,
        items: items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          rate: i.rate,
          amount: i.amount,
        })),
        business: profile ? {
          businessName: profile.businessName,
          phone: profile.phone,
          address: profile.address,
          vatNumber: profile.vatNumber,
        } : null,
      });
    } catch (error) {
      console.error("Get public invoice error:", error);
      res.status(500).json({ error: "Failed to get invoice" });
    }
  });

  app.get("/api/public/invoice/:token/payment-success", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({ error: "Missing session_id" });
      }

      const [invoice] = await db.select().from(invoices)
        .where(eq(invoices.publicToken, token))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      if (session.payment_status === 'paid') {
        await db.update(invoices)
          .set({
            status: 'paid',
            paidAmount: invoice.total,
            paidDate: new Date(),
            paymentMethod: 'card',
            stripePaymentIntentId: session.payment_intent as string,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoice.id));

        const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
        res.redirect(`${baseUrl}/?payment=success&invoice=${invoice.invoiceNumber}`);
      } else {
        res.redirect(`${req.protocol}://${req.get('host')}/?payment=pending&invoice=${invoice.invoiceNumber}`);
      }
    } catch (error) {
      console.error("Payment success handler error:", error);
      res.status(500).json({ error: "Failed to process payment confirmation" });
    }
  });

  app.post("/api/invoices/:id/generate-public-link", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);

      const [invoice] = await db.select().from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, req.session.userId!)
        ))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const publicToken = invoice.publicToken || crypto.randomBytes(32).toString('hex');

      if (!invoice.publicToken) {
        await db.update(invoices)
          .set({ publicToken, updatedAt: new Date() })
          .where(eq(invoices.id, invoiceId));
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      res.json({
        publicUrl: `${baseUrl}/api/public/invoice/${publicToken}`,
        publicToken,
      });
    } catch (error) {
      console.error("Generate public link error:", error);
      res.status(500).json({ error: "Failed to generate public link" });
    }
  });

  // ==================== STRIPE CONNECT ENDPOINTS ====================
  // These endpoints allow users to connect their Stripe account to receive payments

  // Start Stripe Connect onboarding
  app.post("/api/stripe/connect/onboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, req.session.userId!)).limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let accountId = profile?.stripeAccountId;

      // Create a new Connect account if none exists
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: {
            userId: req.session.userId!,
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual",
          settings: {
            payouts: {
              schedule: {
                interval: "daily",
              },
            },
          },
        });
        accountId = account.id;

        // Save the account ID to the user profile
        await db.update(userProfiles)
          .set({
            stripeAccountId: accountId,
            stripeAccountStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, req.session.userId!));
      }

      // Generate the onboarding URL
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "http://localhost:5000";

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
        return_url: `${baseUrl}/?stripe_connect=success`,
        type: "account_onboarding",
      });

      res.json({
        url: accountLink.url,
        accountId,
      });
    } catch (error) {
      console.error("Stripe Connect onboard error:", error);
      res.status(500).json({ error: "Failed to start Stripe onboarding" });
    }
  });

  // Get Stripe Connect account status
  app.get("/api/stripe/connect/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, req.session.userId!)).limit(1);

      if (!profile?.stripeAccountId) {
        return res.json({
          connected: false,
          status: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
        });
      }

      if (!stripe) {
        return res.json({
          connected: true,
          status: profile.stripeAccountStatus || "unknown",
          chargesEnabled: profile.stripeAccountChargesEnabled,
          payoutsEnabled: profile.stripeAccountPayoutsEnabled,
          onboardingComplete: profile.stripeAccountOnboardingComplete,
        });
      }

      // Fetch fresh status from Stripe
      const account = await stripe.accounts.retrieve(profile.stripeAccountId);

      // Update local database with current status
      await db.update(userProfiles)
        .set({
          stripeAccountStatus: account.details_submitted ? "active" : "pending",
          stripeAccountChargesEnabled: account.charges_enabled,
          stripeAccountPayoutsEnabled: account.payouts_enabled,
          stripeAccountOnboardingComplete: account.details_submitted,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, req.session.userId!));

      res.json({
        connected: true,
        status: account.details_submitted ? "active" : "pending",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.details_submitted,
        accountId: profile.stripeAccountId,
      });
    } catch (error) {
      console.error("Stripe Connect status error:", error);
      res.status(500).json({ error: "Failed to get Stripe status" });
    }
  });

  // Refresh onboarding link (if user didn't complete)
  app.get("/api/stripe/connect/refresh", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      if (!stripe) {
        return res.redirect("/?stripe_connect=error");
      }

      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, req.session.userId!)).limit(1);

      if (!profile?.stripeAccountId) {
        return res.redirect("/?stripe_connect=no_account");
      }

      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "http://localhost:5000";

      const accountLink = await stripe.accountLinks.create({
        account: profile.stripeAccountId,
        refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
        return_url: `${baseUrl}/?stripe_connect=success`,
        type: "account_onboarding",
      });

      res.redirect(accountLink.url);
    } catch (error) {
      console.error("Stripe Connect refresh error:", error);
      res.redirect("/?stripe_connect=error");
    }
  });

  // Disconnect Stripe account
  app.delete("/api/stripe/connect/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.update(userProfiles)
        .set({
          stripeAccountId: null,
          stripeAccountStatus: null,
          stripeAccountChargesEnabled: false,
          stripeAccountPayoutsEnabled: false,
          stripeAccountOnboardingComplete: false,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, req.session.userId!));

      res.json({ success: true });
    } catch (error) {
      console.error("Stripe Connect disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Stripe" });
    }
  });

  // Generate payment link for an invoice (using connected account)
  app.post("/api/invoices/:id/payment-link", requireAuth, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const stripe = await getUncachableStripeClient();

      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      // Get invoice
      const [invoice] = await db.select().from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, req.session.userId!)
        ))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get user profile with Stripe account
      const [profile] = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, req.session.userId!))
        .limit(1);

      if (!profile?.stripeAccountId || !profile.stripeAccountChargesEnabled) {
        return res.status(400).json({
          error: "Please complete Stripe Connect setup first",
          code: "STRIPE_NOT_CONNECTED",
        });
      }

      // Get client info for the invoice
      const [client] = await db.select().from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      // Generate or get public token
      const publicToken = invoice.publicToken || crypto.randomBytes(32).toString('hex');
      if (!invoice.publicToken) {
        await db.update(invoices)
          .set({ publicToken, updatedAt: new Date() })
          .where(eq(invoices.id, invoiceId));
      }

      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "http://localhost:5000";

      // Create Checkout Session for payment
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for invoice ${invoice.invoiceNumber}${client ? ` - ${client.name}` : ""}`,
            },
            unit_amount: Math.round(parseFloat(invoice.total) * 100), // Convert to cents
          },
          quantity: 1,
        }],
        payment_intent_data: {
          application_fee_amount: 0, // No platform fee (can be configured later)
          transfer_data: {
            destination: profile.stripeAccountId,
          },
        },
        success_url: `${baseUrl}/api/invoices/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}`,
        cancel_url: `${baseUrl}/api/public/invoice/${publicToken}?payment=cancelled`,
        metadata: {
          invoiceId: invoiceId.toString(),
          userId: req.session.userId!,
          publicToken,
        },
      }, {
        stripeAccount: undefined, // Use platform account for checkout
      });

      // Save the checkout session ID
      await db.update(invoices)
        .set({
          stripeCheckoutSessionId: session.id,
          stripePaymentLink: session.url,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      res.json({
        paymentUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      console.error("Payment link generation error:", error);
      res.status(500).json({ error: "Failed to generate payment link" });
    }
  });

  // Handle successful payment callback
  app.get("/api/invoices/payment-success", async (req: Request, res: Response) => {
    try {
      const { session_id, invoice_id } = req.query;

      if (!session_id || !invoice_id) {
        return res.redirect("/?payment=error");
      }

      const stripe = await getUncachableStripeClient();
      if (!stripe) {
        return res.redirect("/?payment=error");
      }

      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      if (session.payment_status === "paid") {
        const invoiceId = parseInt(invoice_id as string);

        await db.update(invoices)
          .set({
            status: "paid",
            paidAmount: (session.amount_total! / 100).toFixed(2),
            paidDate: new Date(),
            paymentMethod: "card",
            stripePaymentIntentId: session.payment_intent as string,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));

        return res.redirect("/?payment=success");
      }

      res.redirect("/?payment=pending");
    } catch (error) {
      console.error("Payment success handler error:", error);
      res.redirect("/?payment=error");
    }
  });

  // ==================== SUBSCRIPTION & CONSULTATION ENDPOINTS ====================

  const SUBSCRIPTION_PLANS = {
    starter: {
      name: "Starter (Solo)",
      price: 4900,
      features: {
        unlimitedClients: true,
        unlimitedTime: true,
        fullReporting: true,
        quoteToInvoice: true,
        manualInvoicing: true,
        aiFeatures: false,
      }
    },
    professional: {
      name: "Professional (AI-Powered)",
      price: 9900,
      features: {
        unlimitedClients: true,
        unlimitedTime: true,
        fullReporting: true,
        quoteToInvoice: true,
        manualInvoicing: true,
        aiFeatures: true,
        aiVoiceAgent: true,
        voiceToInvoice: true,
        patternLearning: true,
        smartSuggestions: true,
      }
    },
    business: {
      name: "Business (Teams)",
      price: 19900,
      features: {
        unlimitedClients: true,
        unlimitedTime: true,
        fullReporting: true,
        quoteToInvoice: true,
        manualInvoicing: true,
        aiFeatures: true,
        teamManagement: true,
        employeeGeofencing: true,
      }
    }
  };

  // Get current user's subscription
  app.get("/api/subscription", requireAuth, async (req: Request, res: Response) => {
    try {
      const [subscription] = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId!))
        .limit(1);

      // Default to "business" tier for testing - all features unlocked
      // TODO: Change back to "free" when Stripe billing is fully integrated
      const defaultTier = "business";
      const tier = (subscription?.tier as keyof typeof SUBSCRIPTION_PLANS) || defaultTier;
      const planFeatures = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS]?.features || {
        unlimitedClients: true,
        unlimitedTime: true,
        fullReporting: true,
        quoteToInvoice: true,
        manualInvoicing: true,
        aiFeatures: true,
      };

      res.json({
        tier: subscription?.tier || defaultTier,
        status: subscription?.status || "active",
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
        hasPaidMigration: subscription?.hasPaidMigration || false,
        features: planFeatures
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/subscription/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const { tier } = req.body;
      const validTiers = ["starter", "professional", "business", "migration"];

      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      const stripe = await getUncachableStripeClient();

      // Get or create customer
      const [existingSub] = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId!))
        .limit(1);

      let customerId = existingSub?.stripeCustomerId;

      if (!customerId) {
        const [user] = await db.select().from(users)
          .where(eq(users.id, req.session.userId!))
          .limit(1);

        const customer = await stripe.customers.create({
          email: user?.email,
          metadata: { userId: req.session.userId! }
        });
        customerId = customer.id;
      }

      let priceId;
      let mode: 'subscription' | 'payment' = 'subscription';

      if (tier === "starter") priceId = process.env.STRIPE_STARTER_PRICE_ID;
      else if (tier === "professional") priceId = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
      else if (tier === "business") priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
      else if (tier === "migration") {
        priceId = process.env.STRIPE_MIGRATION_PRICE_ID;
        mode = 'payment';
      }

      if (!priceId) {
        return res.status(500).json({
          error: "Subscription pricing not configured. Please contact support."
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: mode,
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        success_url: `${baseUrl}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?subscription=cancelled`,
        metadata: {
          userId: req.session.userId!,
          tier: tier
        }
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Handle successful subscription/payment
  app.get("/api/subscription/success", async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      if (!session_id) return res.redirect("/");

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier;

      if (session.payment_status === 'paid' && userId && tier) {
        const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

        if (tier === 'migration') {
          if (existing) {
            await db.update(subscriptions)
              .set({ hasPaidMigration: true, updatedAt: new Date() })
              .where(eq(subscriptions.userId, userId));
          } else {
            await db.insert(subscriptions).values({
              userId,
              stripeCustomerId: session.customer as string,
              tier: 'free',
              status: 'inactive',
              hasPaidMigration: true,
            });
          }
        } else {
          const updateData = {
            tier,
            status: 'active',
            stripeSubscriptionId: session.subscription as string,
            currentPeriodEnd: session.subscription ? new Date((await stripe.subscriptions.retrieve(session.subscription as string)).current_period_end * 1000) : null,
            updatedAt: new Date(),
          };

          if (existing) {
            await db.update(subscriptions).set(updateData).where(eq(subscriptions.userId, userId));
          } else {
            await db.insert(subscriptions).values({
              userId,
              stripeCustomerId: session.customer as string,
              ...updateData
            });
          }
        }
      }
      res.redirect("/?subscription=success");
    } catch (error) {
      console.error("Subscription success handler error:", error);
      res.redirect("/?subscription=error");
    }
  });

  // Material intelligence endpoint - Professional/Business Tier Only
  app.get("/api/materials/intelligence", requireAuth, async (req: Request, res: Response) => {
    try {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, req.session.userId!)).limit(1);
      const tier = sub?.tier || 'free';

      if (tier === 'free' || tier === 'starter') {
        return res.status(403).json({ error: "Professional plan required for AI features" });
      }
      res.json({ message: "Intelligence enabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials intelligence" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const [subscription] = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId!))
        .limit(1);

      if (!subscription?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const stripe = await getUncachableStripeClient();

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      await db.update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, subscription.id));

      res.json({ success: true, message: "Subscription will cancel at period end" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // ==================== CONSULTATION REQUEST ENDPOINTS ====================

  // Get consultation requests
  app.get("/api/consultations", requireAuth, async (req: Request, res: Response) => {
    try {
      const requests = await db.select().from(consultationRequests)
        .where(eq(consultationRequests.userId, req.session.userId!))
        .orderBy(desc(consultationRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error("Get consultations error:", error);
      res.status(500).json({ error: "Failed to fetch consultations" });
    }
  });

  // Create consultation request (premium only)
  app.post("/api/consultations", requireAuth, async (req: Request, res: Response) => {
    try {
      // Check subscription
      const [subscription] = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId!))
        .limit(1);

      const isPremium = subscription &&
        (subscription.tier === "premium" || subscription.tier === "enterprise") &&
        subscription.status === "active";

      if (!isPremium) {
        return res.status(403).json({
          error: "Data Consultation requires a Premium subscription",
          upgradeRequired: true
        });
      }

      const { title, description, requestType, priority } = req.body;

      if (!title || !description || !requestType) {
        return res.status(400).json({ error: "Title, description, and request type are required" });
      }

      const validTypes = ["pricing_analysis", "supplier_comparison", "industry_benchmark", "custom"];
      if (!validTypes.includes(requestType)) {
        return res.status(400).json({ error: "Invalid request type" });
      }

      const [consultation] = await db.insert(consultationRequests).values({
        userId: req.session.userId!,
        organizationId: req.session.organizationId || null,
        title,
        description,
        requestType,
        priority: priority || "normal",
        status: "pending",
      }).returning();

      res.json(consultation);
    } catch (error) {
      console.error("Create consultation error:", error);
      res.status(500).json({ error: "Failed to create consultation request" });
    }
  });

  // Get single consultation
  app.get("/api/consultations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const consultationId = parseInt(req.params.id);

      const [consultation] = await db.select().from(consultationRequests)
        .where(and(
          eq(consultationRequests.id, consultationId),
          eq(consultationRequests.userId, req.session.userId!)
        ))
        .limit(1);

      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }

      res.json(consultation);
    } catch (error) {
      console.error("Get consultation error:", error);
      res.status(500).json({ error: "Failed to fetch consultation" });
    }
  });

  // ==================== HOLIDAY REQUESTS ENDPOINTS ====================

  // Get all holiday requests for the organization (owners/admins see all, employees see their own)
  app.get("/api/holiday-requests", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const userRole = req.session.organizationRole;

      let whereClause;
      if (userRole === "owner" || userRole === "admin") {
        // Owners and admins see all requests in the organization
        whereClause = eq(holidayRequests.organizationId, organizationId);
      } else {
        // Staff/viewers only see their own requests
        whereClause = and(
          eq(holidayRequests.organizationId, organizationId),
          eq(holidayRequests.employeeUserId, userId)
        );
      }

      const requests = await db
        .select({
          id: holidayRequests.id,
          employeeUserId: holidayRequests.employeeUserId,
          employeeEmail: users.email,
          startDate: holidayRequests.startDate,
          endDate: holidayRequests.endDate,
          holidayType: holidayRequests.holidayType,
          reason: holidayRequests.reason,
          status: holidayRequests.status,
          reviewedBy: holidayRequests.reviewedBy,
          reviewedAt: holidayRequests.reviewedAt,
          reviewNotes: holidayRequests.reviewNotes,
          totalDays: holidayRequests.totalDays,
          createdAt: holidayRequests.createdAt,
        })
        .from(holidayRequests)
        .innerJoin(users, eq(users.id, holidayRequests.employeeUserId))
        .where(whereClause)
        .orderBy(desc(holidayRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error("Get holiday requests error:", error);
      res.status(500).json({ error: "Failed to fetch holiday requests" });
    }
  });

  // Get calendar view of approved holidays
  app.get("/api/holiday-requests/calendar", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const { startDate, endDate } = req.query;

      let whereClause = and(
        eq(holidayRequests.organizationId, organizationId),
        eq(holidayRequests.status, "approved")
      );

      if (startDate && endDate) {
        whereClause = and(
          whereClause,
          gte(holidayRequests.startDate, new Date(startDate as string)),
          lte(holidayRequests.endDate, new Date(endDate as string))
        );
      }

      const holidays = await db
        .select({
          id: holidayRequests.id,
          employeeUserId: holidayRequests.employeeUserId,
          employeeEmail: users.email,
          startDate: holidayRequests.startDate,
          endDate: holidayRequests.endDate,
          holidayType: holidayRequests.holidayType,
          totalDays: holidayRequests.totalDays,
        })
        .from(holidayRequests)
        .innerJoin(users, eq(users.id, holidayRequests.employeeUserId))
        .where(whereClause)
        .orderBy(holidayRequests.startDate);

      res.json(holidays);
    } catch (error) {
      console.error("Get holiday calendar error:", error);
      res.status(500).json({ error: "Failed to fetch holiday calendar" });
    }
  });

  // Create a holiday request
  app.post("/api/holiday-requests", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { startDate, endDate, holidayType, reason } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      // Calculate total days (excluding weekends if needed, for now simple calculation)
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const [request] = await db.insert(holidayRequests).values({
        organizationId,
        employeeUserId: userId,
        startDate: start,
        endDate: end,
        holidayType: holidayType || "annual_leave",
        reason: reason || null,
        status: "pending",
        totalDays: diffDays.toString(),
      }).returning();

      // Notify owners and admins about the new request
      const ownersAndAdmins = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, "active"),
          sql`${organizationMembers.role} IN ('owner', 'admin')`
        ));

      const [requester] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));

      for (const owner of ownersAndAdmins) {
        await db.insert(notifications).values({
          organizationId,
          userId: owner.userId,
          type: "holiday_request",
          title: "New Holiday Request",
          message: `${requester?.email || "An employee"} has requested ${diffDays} day(s) off from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
          referenceType: "holiday_request",
          referenceId: request.id,
        });
      }

      res.json(request);
    } catch (error) {
      console.error("Create holiday request error:", error);
      res.status(500).json({ error: "Failed to create holiday request" });
    }
  });

  // Approve or reject a holiday request (owner/admin only)
  app.put("/api/holiday-requests/:id/review", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      const reviewerId = req.session.userId!;
      const { status, reviewNotes } = req.body;

      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }

      // Verify request belongs to this organization
      const [existingRequest] = await db.select()
        .from(holidayRequests)
        .where(and(
          eq(holidayRequests.id, requestId),
          eq(holidayRequests.organizationId, organizationId)
        ))
        .limit(1);

      if (!existingRequest) {
        return res.status(404).json({ error: "Holiday request not found" });
      }

      if (existingRequest.status !== "pending") {
        return res.status(400).json({ error: "This request has already been reviewed" });
      }

      const [updatedRequest] = await db.update(holidayRequests)
        .set({
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(holidayRequests.id, requestId))
        .returning();

      // Notify the employee about the decision
      await db.insert(notifications).values({
        organizationId,
        userId: existingRequest.employeeUserId,
        type: status === "approved" ? "holiday_approved" : "holiday_rejected",
        title: status === "approved" ? "Holiday Request Approved" : "Holiday Request Rejected",
        message: status === "approved"
          ? `Your holiday request from ${existingRequest.startDate.toLocaleDateString()} to ${existingRequest.endDate.toLocaleDateString()} has been approved.`
          : `Your holiday request from ${existingRequest.startDate.toLocaleDateString()} to ${existingRequest.endDate.toLocaleDateString()} has been rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
        referenceType: "holiday_request",
        referenceId: requestId,
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Review holiday request error:", error);
      res.status(500).json({ error: "Failed to review holiday request" });
    }
  });

  // Cancel a holiday request (employee can cancel their own pending requests)
  app.delete("/api/holiday-requests/:id", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId!;

      const [request] = await db.select()
        .from(holidayRequests)
        .where(and(
          eq(holidayRequests.id, requestId),
          eq(holidayRequests.organizationId, organizationId)
        ))
        .limit(1);

      if (!request) {
        return res.status(404).json({ error: "Holiday request not found" });
      }

      // Only allow cancellation of own pending requests or by admin/owner
      const userRole = req.session.organizationRole;
      if (request.employeeUserId !== userId && userRole !== "owner" && userRole !== "admin") {
        return res.status(403).json({ error: "You can only cancel your own requests" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "Only pending requests can be cancelled" });
      }

      await db.update(holidayRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(holidayRequests.id, requestId));

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel holiday request error:", error);
      res.status(500).json({ error: "Failed to cancel holiday request" });
    }
  });

  // ==================== NOTIFICATIONS ENDPOINTS ====================

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { unreadOnly } = req.query;

      let whereClause = eq(notifications.userId, userId);
      if (unreadOnly === "true") {
        whereClause = and(whereClause, eq(notifications.isRead, false));
      }

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      res.json(userNotifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("Get notification count error:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.session.userId!;

      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // ==================== EMPLOYEE JOB ASSIGNMENTS ENDPOINTS ====================

  // Get all job assignments for an employee
  app.get("/api/employee-assignments", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const userRole = req.session.organizationRole;
      const { employeeId } = req.query;

      let whereClause;
      if (userRole === "owner" || userRole === "admin") {
        // Admin/owner can see all or filter by employee
        if (employeeId) {
          whereClause = and(
            eq(employeeJobAssignments.organizationId, organizationId),
            eq(employeeJobAssignments.employeeUserId, employeeId as string)
          );
        } else {
          whereClause = eq(employeeJobAssignments.organizationId, organizationId);
        }
      } else {
        // Staff/viewers see only their own
        whereClause = and(
          eq(employeeJobAssignments.organizationId, organizationId),
          eq(employeeJobAssignments.employeeUserId, userId)
        );
      }

      const assignments = await db
        .select({
          id: employeeJobAssignments.id,
          employeeUserId: employeeJobAssignments.employeeUserId,
          employeeEmail: users.email,
          jobId: employeeJobAssignments.jobId,
          jobTitle: jobs.title,
          clientName: clients.name,
          startDate: employeeJobAssignments.startDate,
          endDate: employeeJobAssignments.endDate,
          hourlyRate: employeeJobAssignments.hourlyRate,
          notes: employeeJobAssignments.notes,
          isActive: employeeJobAssignments.isActive,
          createdAt: employeeJobAssignments.createdAt,
        })
        .from(employeeJobAssignments)
        .innerJoin(users, eq(users.id, employeeJobAssignments.employeeUserId))
        .innerJoin(jobs, eq(jobs.id, employeeJobAssignments.jobId))
        .leftJoin(clients, eq(clients.id, jobs.clientId))
        .where(whereClause)
        .orderBy(desc(employeeJobAssignments.createdAt));

      res.json(assignments);
    } catch (error) {
      console.error("Get employee assignments error:", error);
      res.status(500).json({ error: "Failed to fetch employee assignments" });
    }
  });

  // Assign employee to job site (admin/owner only)
  app.post("/api/employee-assignments", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const assignedBy = req.session.userId!;
      const { employeeUserId, jobId, startDate, endDate, hourlyRate, notes } = req.body;

      if (!employeeUserId || !jobId) {
        return res.status(400).json({ error: "Employee and job are required" });
      }

      // Verify employee is part of the organization
      const [membership] = await db.select()
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, employeeUserId),
          eq(organizationMembers.status, "active")
        ))
        .limit(1);

      if (!membership) {
        return res.status(400).json({ error: "Employee is not part of this organization" });
      }

      // Verify job belongs to organization
      const [job] = await db.select()
        .from(jobs)
        .where(and(
          eq(jobs.id, jobId),
          eq(jobs.organizationId, organizationId)
        ))
        .limit(1);

      if (!job) {
        return res.status(400).json({ error: "Job not found" });
      }

      const [assignment] = await db.insert(employeeJobAssignments).values({
        organizationId,
        employeeUserId,
        jobId,
        assignedBy,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        hourlyRate: hourlyRate || null,
        notes: notes || null,
        isActive: true,
      }).returning();

      // Notify the employee
      await db.insert(notifications).values({
        organizationId,
        userId: employeeUserId,
        type: "assignment_added",
        title: "New Job Assignment",
        message: `You have been assigned to ${job.title}`,
        referenceType: "job_assignment",
        referenceId: assignment.id,
      });

      res.json(assignment);
    } catch (error: any) {
      if (error.code === "23505") { // Unique constraint violation
        return res.status(400).json({ error: "Employee is already assigned to this job site" });
      }
      console.error("Create employee assignment error:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Update job assignment
  app.put("/api/employee-assignments/:id", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      const { startDate, endDate, hourlyRate, notes, isActive } = req.body;

      const [assignment] = await db.update(employeeJobAssignments)
        .set({
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          hourlyRate: hourlyRate || null,
          notes: notes || null,
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(employeeJobAssignments.id, assignmentId),
          eq(employeeJobAssignments.organizationId, organizationId)
        ))
        .returning();

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      console.error("Update employee assignment error:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Remove job assignment
  app.delete("/api/employee-assignments/:id", requireAuth, requireOrganization, canManage, async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      await db.delete(employeeJobAssignments)
        .where(and(
          eq(employeeJobAssignments.id, assignmentId),
          eq(employeeJobAssignments.organizationId, organizationId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete employee assignment error:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Get employees with their job assignments (for management view)
  app.get("/api/employees", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;

      const members = await db
        .select({
          userId: organizationMembers.userId,
          email: users.email,
          role: organizationMembers.role,
          status: organizationMembers.status,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, "active")
        ))
        .orderBy(organizationMembers.role);

      res.json(members);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // ============= SUPPLIER INVOICES API =============

  // Get all supplier invoices
  app.get("/api/supplier-invoices", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const { year, supplier, status } = req.query;
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 2000);
      const offset = parseInt(req.query.offset as string) || 0;

      let conditions = [eq(supplierInvoices.organizationId, organizationId)];

      if (year) {
        const selectedYear = parseInt(year as string);
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        conditions.push(gte(supplierInvoices.invoiceDate, startOfYear));
        conditions.push(lte(supplierInvoices.invoiceDate, endOfYear));
      }

      if (supplier) {
        conditions.push(eq(supplierInvoices.supplierName, supplier as string));
      }

      if (status) {
        conditions.push(eq(supplierInvoices.status, status as string));
      }

      const result = await db.select().from(supplierInvoices)
        .where(and(...conditions))
        .orderBy(desc(supplierInvoices.invoiceDate))
        .limit(limit)
        .offset(offset);

      res.json(result);
    } catch (error) {
      console.error("Get supplier invoices error:", error);
      res.status(500).json({ error: "Failed to get supplier invoices" });
    }
  });

  // Get single supplier invoice with items
  app.get("/api/supplier-invoices/:id", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [invoice] = await db.select().from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.id, invoiceId),
          eq(supplierInvoices.organizationId, organizationId)
        ))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Supplier invoice not found" });
      }

      const items = await db.select().from(supplierInvoiceItems)
        .where(eq(supplierInvoiceItems.supplierInvoiceId, invoiceId))
        .orderBy(supplierInvoiceItems.sortOrder);

      res.json({ ...invoice, items });
    } catch (error) {
      console.error("Get supplier invoice error:", error);
      res.status(500).json({ error: "Failed to get supplier invoice" });
    }
  });

  // Create supplier invoice manually
  app.post("/api/supplier-invoices", requireAuth, requireOrganization, canWrite, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { supplierName, supplierVatNumber, supplierAddress, supplierEmail, supplierPhone,
        invoiceNumber, invoiceDate, dueDate, orderReference, deliveryAddress,
        netAmount, vatAmount, totalAmount, vatRate, currency, status, notes, items } = req.body;

      const [invoice] = await db.insert(supplierInvoices).values({
        organizationId,
        userId,
        supplierName,
        supplierVatNumber,
        supplierAddress,
        supplierEmail,
        supplierPhone,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        orderReference,
        deliveryAddress,
        netAmount: netAmount?.toString() || "0",
        vatAmount: vatAmount?.toString() || "0",
        totalAmount: totalAmount?.toString() || "0",
        vatRate: vatRate?.toString() || "0.23",
        currency: currency || "EUR",
        status: status || "unpaid",
        notes,
      }).returning();

      if (items && Array.isArray(items) && items.length > 0) {
        await db.insert(supplierInvoiceItems).values(
          items.map((item: any, index: number) => ({
            supplierInvoiceId: invoice.id,
            itemCode: item.itemCode,
            description: item.description,
            category: item.category,
            quantity: item.quantity?.toString() || "1",
            unit: item.unit || "each",
            unitPrice: item.unitPrice?.toString() || "0",
            lineTotal: item.lineTotal?.toString() || "0",
            vatRate: item.vatRate?.toString() || "0.23",
            vatAmount: item.vatAmount?.toString() || "0",
            sortOrder: index,
          }))
        );
      }

      res.status(201).json(invoice);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Invoice already exists for this supplier" });
      }
      console.error("Create supplier invoice error:", error);
      res.status(500).json({ error: "Failed to create supplier invoice" });
    }
  });

  // Upload and extract supplier invoice via AI
  app.post("/api/supplier-invoices/extract", requireAuth, requireOrganization, canWrite, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Convert file to base64 for Gemini vision
      const base64Data = fileBuffer.toString("base64");

      // Use Gemini for document extraction
      const model = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              {
                text: `Extract all data from this supplier invoice. Return a JSON object with this exact structure:
{
  "supplierName": "Company Name",
  "supplierVatNumber": "IE1234567X or null",
  "supplierAddress": "Full address or null",
  "supplierEmail": "email@example.com or null",
  "supplierPhone": "phone number or null",
  "invoiceNumber": "INV-123",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD or null",
  "orderReference": "PO or job reference or null",
  "deliveryAddress": "delivery address or null",
  "netAmount": 100.00,
  "vatAmount": 23.00,
  "totalAmount": 123.00,
  "vatRate": 0.23,
  "currency": "EUR",
  "items": [
    {
      "itemCode": "SKU-123 or null",
      "description": "Item description",
      "category": "Electrical/Plumbing/HVAC/General/Safety/Tools/Other",
      "quantity": 2,
      "unit": "each/metre/box/pack/roll/kg/litre",
      "unitPrice": 50.00,
      "lineTotal": 100.00,
      "vatRate": 0.23
    }
  ]
}

Important:
- Extract ALL line items from the invoice
- Auto-categorize items into: Electrical, Plumbing, HVAC, General, Safety, Tools, Other
- Use Irish VAT rates (23%, 13.5%, 9%, 0%)
- Normalize amounts to numbers (no currency symbols)
- Return ONLY valid JSON, no markdown or explanations`,
              },
            ],
          },
        ],
      });

      const response = await model;
      const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse the extracted data
      let extractedData;
      try {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", textContent);
        return res.status(422).json({
          error: "Could not parse invoice data",
          rawText: textContent.substring(0, 500)
        });
      }

      // Store the file in app storage
      const fileKey = `supplier-invoices/${organizationId}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(fileKey, fileBuffer, mimeType);

      // Determine if extraction needs review (missing critical fields)
      const needsReview = !extractedData.supplierName ||
        !extractedData.invoiceNumber ||
        !extractedData.totalAmount ||
        extractedData.totalAmount === 0 ||
        !extractedData.items ||
        extractedData.items.length === 0;

      // Create the supplier invoice record
      const [invoice] = await db.insert(supplierInvoices).values({
        organizationId,
        userId,
        supplierName: extractedData.supplierName || "Unknown Supplier",
        supplierVatNumber: extractedData.supplierVatNumber,
        supplierAddress: extractedData.supplierAddress,
        supplierEmail: extractedData.supplierEmail,
        supplierPhone: extractedData.supplierPhone,
        invoiceNumber: extractedData.invoiceNumber || `AUTO-${Date.now()}`,
        invoiceDate: extractedData.invoiceDate ? new Date(extractedData.invoiceDate) : new Date(),
        dueDate: extractedData.dueDate ? new Date(extractedData.dueDate) : null,
        orderReference: extractedData.orderReference,
        deliveryAddress: extractedData.deliveryAddress,
        netAmount: extractedData.netAmount?.toString() || "0",
        vatAmount: extractedData.vatAmount?.toString() || "0",
        totalAmount: extractedData.totalAmount?.toString() || "0",
        vatRate: extractedData.vatRate?.toString() || "0.23",
        currency: extractedData.currency || "EUR",
        status: "unpaid",
        processingStatus: needsReview ? "needs_review" : "complete",
        documentUrl: fileKey,
        extractedRawData: JSON.stringify(extractedData),
      }).returning();

      // Insert line items
      if (extractedData.items && Array.isArray(extractedData.items) && extractedData.items.length > 0) {
        await db.insert(supplierInvoiceItems).values(
          extractedData.items.map((item: any, index: number) => ({
            supplierInvoiceId: invoice.id,
            itemCode: item.itemCode,
            description: item.description || "Unknown item",
            category: item.category || "Other",
            quantity: (item.quantity || 1).toString(),
            unit: item.unit || "each",
            unitPrice: (item.unitPrice || 0).toString(),
            lineTotal: (item.lineTotal || 0).toString(),
            vatRate: (item.vatRate || 0.23).toString(),
            vatAmount: ((item.lineTotal || 0) * (item.vatRate || 0.23)).toFixed(2),
            sortOrder: index,
          }))
        );
      }

      // Return full invoice with items
      const items = await db.select().from(supplierInvoiceItems)
        .where(eq(supplierInvoiceItems.supplierInvoiceId, invoice.id));

      res.status(201).json({ ...invoice, items, extractedData });
    } catch (error) {
      console.error("Extract supplier invoice error:", error);
      res.status(500).json({ error: "Failed to extract supplier invoice" });
    }
  });

  // Update supplier invoice
  app.put("/api/supplier-invoices/:id", requireAuth, requireOrganization, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;
      const { supplierName, supplierVatNumber, supplierAddress, supplierEmail, supplierPhone,
        invoiceNumber, invoiceDate, dueDate, orderReference, deliveryAddress,
        netAmount, vatAmount, totalAmount, vatRate, currency, status, processingStatus, paidDate, notes, items } = req.body;

      const [invoice] = await db.update(supplierInvoices)
        .set({
          supplierName,
          supplierVatNumber,
          supplierAddress,
          supplierEmail,
          supplierPhone,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : null,
          orderReference,
          deliveryAddress,
          netAmount: netAmount?.toString(),
          vatAmount: vatAmount?.toString(),
          totalAmount: totalAmount?.toString(),
          vatRate: vatRate?.toString(),
          currency,
          status,
          processingStatus,
          paidDate: paidDate ? new Date(paidDate) : null,
          notes,
          updatedAt: new Date(),
        })
        .where(and(
          eq(supplierInvoices.id, invoiceId),
          eq(supplierInvoices.organizationId, organizationId)
        ))
        .returning();

      if (!invoice) {
        return res.status(404).json({ error: "Supplier invoice not found" });
      }

      // Update items if provided
      if (items && Array.isArray(items)) {
        await db.delete(supplierInvoiceItems).where(eq(supplierInvoiceItems.supplierInvoiceId, invoiceId));
        if (items.length > 0) {
          await db.insert(supplierInvoiceItems).values(
            items.map((item: any, index: number) => ({
              supplierInvoiceId: invoiceId,
              itemCode: item.itemCode,
              description: item.description,
              category: item.category,
              quantity: item.quantity?.toString() || "1",
              unit: item.unit || "each",
              unitPrice: item.unitPrice?.toString() || "0",
              lineTotal: item.lineTotal?.toString() || "0",
              vatRate: item.vatRate?.toString() || "0.23",
              vatAmount: item.vatAmount?.toString() || "0",
              sortOrder: index,
            }))
          );
        }
      }

      res.json(invoice);
    } catch (error) {
      console.error("Update supplier invoice error:", error);
      res.status(500).json({ error: "Failed to update supplier invoice" });
    }
  });

  // Delete supplier invoice
  app.delete("/api/supplier-invoices/:id", requireAuth, requireOrganization, canWrite, async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const organizationId = req.session.organizationId!;

      const [invoice] = await db.select().from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.id, invoiceId),
          eq(supplierInvoices.organizationId, organizationId)
        ))
        .limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Supplier invoice not found" });
      }

      // Delete associated document from storage
      if (invoice.documentUrl) {
        try {
          await deleteFile(invoice.documentUrl);
        } catch (e) {
          console.error("Failed to delete document:", e);
        }
      }

      await db.delete(supplierInvoices).where(eq(supplierInvoices.id, invoiceId));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete supplier invoice error:", error);
      res.status(500).json({ error: "Failed to delete supplier invoice" });
    }
  });

  // Get supplier invoice analytics/summary
  app.get("/api/supplier-invoices/analytics/summary", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const { year, months } = req.query;

      let dateConditions: any[] = [];
      if (year) {
        const selectedYear = parseInt(year as string);
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        dateConditions.push(gte(supplierInvoices.invoiceDate, startOfYear));
        dateConditions.push(lte(supplierInvoices.invoiceDate, endOfYear));
      } else if (months) {
        const monthsBack = parseInt(months as string);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        dateConditions.push(gte(supplierInvoices.invoiceDate, startDate));
      }

      // Total spending by supplier
      const bySupplier = await db.select({
        supplierName: supplierInvoices.supplierName,
        invoiceCount: sql<number>`count(*)::int`,
        totalNet: sql<string>`COALESCE(sum(${supplierInvoices.netAmount}::numeric), 0)::text`,
        totalVat: sql<string>`COALESCE(sum(${supplierInvoices.vatAmount}::numeric), 0)::text`,
        totalAmount: sql<string>`COALESCE(sum(${supplierInvoices.totalAmount}::numeric), 0)::text`,
      }).from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.organizationId, organizationId),
          ...dateConditions
        ))
        .groupBy(supplierInvoices.supplierName)
        .orderBy(desc(sql`sum(${supplierInvoices.totalAmount}::numeric)`));

      // Total spending by category (from items)
      const byCategory = await db.select({
        category: supplierInvoiceItems.category,
        itemCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`COALESCE(sum(${supplierInvoiceItems.lineTotal}::numeric), 0)::text`,
      }).from(supplierInvoiceItems)
        .innerJoin(supplierInvoices, eq(supplierInvoiceItems.supplierInvoiceId, supplierInvoices.id))
        .where(and(
          eq(supplierInvoices.organizationId, organizationId),
          ...dateConditions
        ))
        .groupBy(supplierInvoiceItems.category)
        .orderBy(desc(sql`sum(${supplierInvoiceItems.lineTotal}::numeric)`));

      // Monthly spending trend
      const monthlyTrend = await db.select({
        month: sql<string>`to_char(${supplierInvoices.invoiceDate}, 'YYYY-MM')`,
        invoiceCount: sql<number>`count(*)::int`,
        totalAmount: sql<string>`COALESCE(sum(${supplierInvoices.totalAmount}::numeric), 0)::text`,
      }).from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.organizationId, organizationId),
          ...dateConditions
        ))
        .groupBy(sql`to_char(${supplierInvoices.invoiceDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${supplierInvoices.invoiceDate}, 'YYYY-MM')`);

      // Overall totals
      const [totals] = await db.select({
        invoiceCount: sql<number>`count(*)::int`,
        totalNet: sql<string>`COALESCE(sum(${supplierInvoices.netAmount}::numeric), 0)::text`,
        totalVat: sql<string>`COALESCE(sum(${supplierInvoices.vatAmount}::numeric), 0)::text`,
        totalAmount: sql<string>`COALESCE(sum(${supplierInvoices.totalAmount}::numeric), 0)::text`,
        unpaidCount: sql<number>`count(*) FILTER (WHERE ${supplierInvoices.status} = 'unpaid')::int`,
        unpaidAmount: sql<string>`COALESCE(sum(${supplierInvoices.totalAmount}::numeric) FILTER (WHERE ${supplierInvoices.status} = 'unpaid'), 0)::text`,
      }).from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.organizationId, organizationId),
          ...dateConditions
        ));

      res.json({
        totals,
        bySupplier,
        byCategory,
        monthlyTrend,
      });
    } catch (error) {
      console.error("Get supplier invoice analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Get unique suppliers list
  app.get("/api/supplier-invoices/suppliers/list", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;

      const suppliers = await db.selectDistinct({
        supplierName: supplierInvoices.supplierName,
      }).from(supplierInvoices)
        .where(eq(supplierInvoices.organizationId, organizationId))
        .orderBy(supplierInvoices.supplierName);

      res.json(suppliers.map(s => s.supplierName));
    } catch (error) {
      console.error("Get suppliers list error:", error);
      res.status(500).json({ error: "Failed to get suppliers" });
    }
  });

  // Agent command API routes
  app.post("/api/agent/command", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const { input } = req.body;

      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Input is required" });
      }

      const response = await processAgentCommand(
        req.session.organizationId!,
        req.session.userId!,
        input
      );

      res.json(response);
    } catch (error) {
      console.error("Agent command error:", error);
      res.status(500).json({ error: "Failed to process command" });
    }
  });

  app.post("/api/agent/confirm", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const { draftId } = req.body;

      if (!draftId) {
        return res.status(400).json({ error: "Draft ID is required" });
      }

      const response = await confirmDraft(
        req.session.organizationId!,
        req.session.userId!,
        draftId
      );

      res.json(response);
    } catch (error) {
      console.error("Agent confirm error:", error);
      res.status(500).json({ error: "Failed to confirm draft" });
    }
  });

  app.post("/api/agent/cancel", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const response = await cancelDraft(
        req.session.organizationId!,
        req.session.userId!
      );

      res.json(response);
    } catch (error) {
      console.error("Agent cancel error:", error);
      res.status(500).json({ error: "Failed to cancel draft" });
    }
  });

  app.get("/api/agent/draft", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const draft = getCurrentDraft(
        req.session.organizationId!,
        req.session.userId!
      );

      res.json(draft || { type: null, draft: null });
    } catch (error) {
      console.error("Get agent draft error:", error);
      res.status(500).json({ error: "Failed to get draft" });
    }
  });

  app.get("/api/agent/suggestions", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const suggestions = await getPersonalizedSuggestions(
        req.session.organizationId!,
        req.session.userId!,
        req.query.input as string | undefined
      );

      res.json(suggestions);
    } catch (error) {
      console.error("Get agent suggestions error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // ============================================
  // Team Collaboration - Channels & Messages
  // ============================================

  // Get or create default channel for organization
  app.get("/api/team/channel", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;

      // Find existing default channel
      let channel = await db.query.teamChannels.findFirst({
        where: and(
          eq(teamChannels.organizationId, organizationId),
          eq(teamChannels.isDefault, true)
        ),
      });

      // Create default channel if none exists
      if (!channel) {
        const [newChannel] = await db.insert(teamChannels).values({
          organizationId,
          name: "Team Chat",
          description: "General team discussions",
          channelType: "general",
          isDefault: true,
          createdBy: userId,
        }).returning();
        channel = newChannel;
      }

      res.json(channel);
    } catch (error) {
      console.error("Get team channel error:", error);
      res.status(500).json({ error: "Failed to get team channel" });
    }
  });

  // Get messages for a channel
  app.get("/api/team/channel/:channelId/messages", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const organizationId = req.session.organizationId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;

      // Verify channel belongs to organization
      const channel = await db.query.teamChannels.findFirst({
        where: and(
          eq(teamChannels.id, channelId),
          eq(teamChannels.organizationId, organizationId)
        ),
      });

      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      // Get messages with sender info
      const conditions = [
        eq(channelMessages.channelId, channelId),
        eq(channelMessages.isDeleted, false),
      ];
      if (before) {
        conditions.push(sql`${channelMessages.id} < ${before}`);
      }

      const messages = await db
        .select({
          id: channelMessages.id,
          channelId: channelMessages.channelId,
          senderId: channelMessages.senderId,
          messageType: channelMessages.messageType,
          content: channelMessages.content,
          imageUrl: channelMessages.imageUrl,
          metadata: channelMessages.metadata,
          isEdited: channelMessages.isEdited,
          createdAt: channelMessages.createdAt,
          senderEmail: users.email,
        })
        .from(channelMessages)
        .leftJoin(users, eq(users.id, channelMessages.senderId))
        .where(and(...conditions))
        .orderBy(desc(channelMessages.createdAt))
        .limit(limit);

      res.json(messages.reverse());
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send a message
  app.post("/api/team/channel/:channelId/messages", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { content, messageType = "text", imageUrl, metadata } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Verify channel belongs to organization
      const channel = await db.query.teamChannels.findFirst({
        where: and(
          eq(teamChannels.id, channelId),
          eq(teamChannels.organizationId, organizationId)
        ),
      });

      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const [message] = await db.insert(channelMessages).values({
        channelId,
        senderId: userId,
        messageType,
        content: content.trim(),
        imageUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }).returning();

      // Get sender info
      const sender = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true },
      });

      res.json({
        ...message,
        senderEmail: sender?.email,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.post("/api/team/channel/:channelId/read", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.session.userId!;
      const { lastMessageId } = req.body;

      await db
        .insert(messageReads)
        .values({
          channelId,
          userId,
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [messageReads.channelId, messageReads.userId],
          set: {
            lastReadMessageId: lastMessageId,
            lastReadAt: new Date(),
          },
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Get unread count for organization
  app.get("/api/team/unread-count", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;

      // Get default channel
      const channel = await db.query.teamChannels.findFirst({
        where: and(
          eq(teamChannels.organizationId, organizationId),
          eq(teamChannels.isDefault, true)
        ),
      });

      if (!channel) {
        return res.json({ unreadCount: 0 });
      }

      // Get last read message id
      const readInfo = await db.query.messageReads.findFirst({
        where: and(
          eq(messageReads.channelId, channel.id),
          eq(messageReads.userId, userId)
        ),
      });

      // Count messages after last read
      const conditions = [
        eq(channelMessages.channelId, channel.id),
        eq(channelMessages.isDeleted, false),
        sql`${channelMessages.senderId} != ${userId}`,
      ];
      if (readInfo?.lastReadMessageId) {
        conditions.push(sql`${channelMessages.id} > ${readInfo.lastReadMessageId}`);
      }

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(channelMessages)
        .where(and(...conditions));

      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // ============================================
  // Team Collaboration - Tasks
  // ============================================

  // Get tasks for organization
  app.get("/api/team/tasks", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const status = req.query.status as string;
      const assignee = req.query.assignee as string;

      const conditions = [eq(teamTasks.organizationId, organizationId)];
      if (status && status !== "all") {
        conditions.push(eq(teamTasks.status, status));
      }

      const tasks = await db
        .select({
          id: teamTasks.id,
          title: teamTasks.title,
          description: teamTasks.description,
          status: teamTasks.status,
          priority: teamTasks.priority,
          dueDate: teamTasks.dueDate,
          linkedEntityType: teamTasks.linkedEntityType,
          linkedEntityId: teamTasks.linkedEntityId,
          createdBy: teamTasks.createdBy,
          completedAt: teamTasks.completedAt,
          createdAt: teamTasks.createdAt,
        })
        .from(teamTasks)
        .where(and(...conditions))
        .orderBy(desc(teamTasks.createdAt));

      // Get assignments for each task
      const taskIds = tasks.map(t => t.id);
      const assignments = taskIds.length > 0
        ? await db
          .select({
            taskId: taskAssignments.taskId,
            assigneeId: taskAssignments.assigneeId,
            assigneeEmail: users.email,
          })
          .from(taskAssignments)
          .leftJoin(users, eq(users.id, taskAssignments.assigneeId))
          .where(sql`${taskAssignments.taskId} = ANY(${sql.raw(`ARRAY[${taskIds.join(",")}]`)})`)
        : [];

      // Attach assignments to tasks
      const tasksWithAssignments = tasks.map(task => ({
        ...task,
        assignees: assignments
          .filter(a => a.taskId === task.id)
          .map(a => ({ id: a.assigneeId, email: a.assigneeEmail })),
      }));

      // Filter by assignee if specified
      const finalTasks = assignee
        ? tasksWithAssignments.filter(t => t.assignees.some(a => a.id === assignee))
        : tasksWithAssignments;

      res.json(finalTasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  // Create a task
  app.post("/api/team/tasks", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { title, description, priority, dueDate, assigneeIds, linkedEntityType, linkedEntityId } = req.body;

      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Task title is required" });
      }

      const [task] = await db.insert(teamTasks).values({
        organizationId,
        title: title.trim(),
        description: description?.trim(),
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        linkedEntityType,
        linkedEntityId,
        createdBy: userId,
      }).returning();

      // Add assignments if any
      if (assigneeIds && assigneeIds.length > 0) {
        await db.insert(taskAssignments).values(
          assigneeIds.map((assigneeId: string) => ({
            taskId: task.id,
            assigneeId,
            assignedBy: userId,
          }))
        );
      }

      // Get creator info
      const creator = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true },
      });

      // Get assignees
      const assignees = assigneeIds && assigneeIds.length > 0
        ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(sql`${users.id} = ANY(${sql.raw(`ARRAY['${assigneeIds.join("','")}']`)})`)
        : [];

      res.json({
        ...task,
        creatorEmail: creator?.email,
        assignees,
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task status
  app.patch("/api/team/tasks/:taskId", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { status, title, description, priority, dueDate } = req.body;

      // Verify task belongs to organization
      const existingTask = await db.query.teamTasks.findFirst({
        where: and(
          eq(teamTasks.id, taskId),
          eq(teamTasks.organizationId, organizationId)
        ),
      });

      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description?.trim();
      if (priority) updates.priority = priority;
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

      // Mark as completed if status is done
      if (status === "done" && existingTask.status !== "done") {
        updates.completedAt = new Date();
        updates.completedBy = userId;
      } else if (status && status !== "done") {
        updates.completedAt = null;
        updates.completedBy = null;
      }

      const [updatedTask] = await db
        .update(teamTasks)
        .set(updates)
        .where(eq(teamTasks.id, taskId))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Assign task to user
  app.post("/api/team/tasks/:taskId/assign", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const organizationId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { assigneeId } = req.body;

      if (!assigneeId) {
        return res.status(400).json({ error: "Assignee ID is required" });
      }

      // Verify task belongs to organization
      const task = await db.query.teamTasks.findFirst({
        where: and(
          eq(teamTasks.id, taskId),
          eq(teamTasks.organizationId, organizationId)
        ),
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await db
        .insert(taskAssignments)
        .values({
          taskId,
          assigneeId,
          assignedBy: userId,
        })
        .onConflictDoNothing();

      res.json({ success: true });
    } catch (error) {
      console.error("Assign task error:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Unassign task from user
  app.delete("/api/team/tasks/:taskId/assign/:assigneeId", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const assigneeId = req.params.assigneeId;
      const organizationId = req.session.organizationId!;

      // Verify task belongs to organization
      const task = await db.query.teamTasks.findFirst({
        where: and(
          eq(teamTasks.id, taskId),
          eq(teamTasks.organizationId, organizationId)
        ),
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await db
        .delete(taskAssignments)
        .where(and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.assigneeId, assigneeId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Unassign task error:", error);
      res.status(500).json({ error: "Failed to unassign task" });
    }
  });

  // Get my assigned tasks
  app.get("/api/team/my-tasks", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const organizationId = req.session.organizationId!;

      const myTasks = await db
        .select({
          id: teamTasks.id,
          title: teamTasks.title,
          description: teamTasks.description,
          status: teamTasks.status,
          priority: teamTasks.priority,
          dueDate: teamTasks.dueDate,
          createdAt: teamTasks.createdAt,
        })
        .from(teamTasks)
        .innerJoin(taskAssignments, eq(taskAssignments.taskId, teamTasks.id))
        .where(and(
          eq(teamTasks.organizationId, organizationId),
          eq(taskAssignments.assigneeId, userId),
          sql`${teamTasks.status} != 'cancelled'`
        ))
        .orderBy(teamTasks.dueDate, desc(teamTasks.createdAt));

      res.json(myTasks);
    } catch (error) {
      console.error("Get my tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  // Delete task
  app.delete("/api/team/tasks/:taskId", requireAuth, requireOrganization, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const organizationId = req.session.organizationId!;

      // Verify task belongs to organization
      const task = await db.query.teamTasks.findFirst({
        where: and(
          eq(teamTasks.id, taskId),
          eq(teamTasks.organizationId, organizationId)
        ),
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await db.delete(teamTasks).where(eq(teamTasks.id, taskId));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  const httpServer = createServer(app);
  app.post("/api/support/migration-request", requireAuth, async (req: Request, res: Response) => {
    try {
      const { details } = req.body;
      if (!details) {
        return res.status(400).json({ error: "Migration details are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await sendMigrationRequestEmail(user.email, details);

      res.json({
        success: true,
        message: "Migration request received. We will contact you shortly.",
        emailSent: isEmailConfigured()
      });
    } catch (error) {
      console.error("Migration request error:", error);
      res.status(500).json({ error: "Failed to submit migration request" });
    }
  });

  return httpServer;
}
