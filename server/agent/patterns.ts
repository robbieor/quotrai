import { db } from "../db";
import { userPatterns, agentCommandHistory, clients, globalTemplates } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ParsedCommand } from "./command-parser";

export interface PatternSuggestion {
  type: "command" | "client" | "template" | "recent";
  label: string;
  command: string;
  score: number;
}

export async function recordCommandUsage(
  organizationId: number,
  userId: string,
  rawInput: string,
  parsed: ParsedCommand,
  resultType: string,
  wasSuccessful: boolean,
  clientId?: number,
  templateId?: number,
  executionTimeMs?: number
): Promise<void> {
  try {
    const now = new Date();
    
    await db.insert(agentCommandHistory).values({
      userId,
      organizationId,
      rawInput,
      parsedCommand: JSON.stringify(parsed),
      commandType: parsed.type,
      clientId,
      templateId,
      wasSuccessful,
      resultType,
      executionTimeMs,
      dayOfWeek: now.getDay(),
      hourOfDay: now.getHours(),
    });

    if (parsed.type && parsed.type !== "unknown") {
      await updatePattern(organizationId, userId, "command_usage", `/${parsed.type}`, null);
    }
    
    if (clientId) {
      await updatePattern(organizationId, userId, "client_frequency", `client:${clientId}`, null);
    }
    
    if (templateId) {
      await updatePattern(organizationId, userId, "template_preference", `template:${templateId}`, null);
    }
    
    const hourBucket = Math.floor(now.getHours() / 3) * 3;
    await updatePattern(organizationId, userId, "time_of_day", `hour:${hourBucket}`, null);
    
  } catch (error) {
    console.error("Error recording command usage:", error);
  }
}

async function updatePattern(
  organizationId: number,
  userId: string,
  patternType: string,
  patternKey: string,
  patternValue: string | null
): Promise<void> {
  const existing = await db.select()
    .from(userPatterns)
    .where(and(
      eq(userPatterns.userId, userId),
      eq(userPatterns.organizationId, organizationId),
      eq(userPatterns.patternType, patternType),
      eq(userPatterns.patternKey, patternKey)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(userPatterns)
      .set({
        usageCount: sql`${userPatterns.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
        patternValue: patternValue || existing[0].patternValue,
      })
      .where(eq(userPatterns.id, existing[0].id));
  } else {
    await db.insert(userPatterns).values({
      userId,
      organizationId,
      patternType,
      patternKey,
      patternValue,
    });
  }
}

export async function getPersonalizedSuggestions(
  organizationId: number,
  userId: string,
  currentInput?: string
): Promise<PatternSuggestion[]> {
  const suggestions: PatternSuggestion[] = [];
  
  try {
    const frequentClients = await db.select({
      clientId: sql<number>`CAST(REPLACE(${userPatterns.patternKey}, 'client:', '') AS INTEGER)`,
      usageCount: userPatterns.usageCount,
      lastUsedAt: userPatterns.lastUsedAt,
    })
      .from(userPatterns)
      .where(and(
        eq(userPatterns.userId, userId),
        eq(userPatterns.organizationId, organizationId),
        eq(userPatterns.patternType, "client_frequency")
      ))
      .orderBy(desc(userPatterns.usageCount))
      .limit(5);

    if (frequentClients.length > 0) {
      const clientIds = frequentClients.map(c => c.clientId).filter(id => id > 0);
      
      if (clientIds.length > 0) {
        const clientDetails = await db.select({
          id: clients.id,
          name: clients.name,
        })
          .from(clients)
          .where(sql`${clients.id} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`);
        
        for (const client of clientDetails) {
          const usage = frequentClients.find(c => c.clientId === client.id);
          suggestions.push({
            type: "client",
            label: `Quote for ${client.name}`,
            command: `/quote callout "${client.name}"`,
            score: (usage?.usageCount || 1) * 10,
          });
        }
      }
    }

    const frequentTemplates = await db.select({
      templateId: sql<number>`CAST(REPLACE(${userPatterns.patternKey}, 'template:', '') AS INTEGER)`,
      usageCount: userPatterns.usageCount,
    })
      .from(userPatterns)
      .where(and(
        eq(userPatterns.userId, userId),
        eq(userPatterns.organizationId, organizationId),
        eq(userPatterns.patternType, "template_preference")
      ))
      .orderBy(desc(userPatterns.usageCount))
      .limit(3);

    if (frequentTemplates.length > 0) {
      const templateIds = frequentTemplates.map(t => t.templateId).filter(id => id > 0);
      
      if (templateIds.length > 0) {
        const templates = await db.select({
          id: globalTemplates.id,
          name: globalTemplates.name,
        })
          .from(globalTemplates)
          .where(sql`${globalTemplates.id} IN (${sql.join(templateIds.map(id => sql`${id}`), sql`, `)})`);
        
        for (const template of templates) {
          const usage = frequentTemplates.find(t => t.templateId === template.id);
          const keyword = template.name.toLowerCase().replace(/\s+/g, "-");
          suggestions.push({
            type: "template",
            label: `${template.name} quote`,
            command: `/quote ${keyword}`,
            score: (usage?.usageCount || 1) * 8,
          });
        }
      }
    }

    const recentCommands = await db.select({
      rawInput: agentCommandHistory.rawInput,
      commandType: agentCommandHistory.commandType,
    })
      .from(agentCommandHistory)
      .where(and(
        eq(agentCommandHistory.userId, userId),
        eq(agentCommandHistory.organizationId, organizationId),
        eq(agentCommandHistory.wasSuccessful, true)
      ))
      .orderBy(desc(agentCommandHistory.createdAt))
      .limit(5);

    const seenCommands = new Set<string>();
    for (const cmd of recentCommands) {
      if (cmd.rawInput.startsWith("/") && !seenCommands.has(cmd.rawInput)) {
        seenCommands.add(cmd.rawInput);
        suggestions.push({
          type: "recent",
          label: cmd.rawInput,
          command: cmd.rawInput,
          score: 5,
        });
      }
    }

    const now = new Date();
    const hourBucket = Math.floor(now.getHours() / 3) * 3;
    const timePattern = await db.select()
      .from(userPatterns)
      .where(and(
        eq(userPatterns.userId, userId),
        eq(userPatterns.organizationId, organizationId),
        eq(userPatterns.patternType, "time_of_day"),
        eq(userPatterns.patternKey, `hour:${hourBucket}`)
      ))
      .limit(1);

    if (timePattern.length > 0 && timePattern[0].usageCount > 5) {
      suggestions.forEach(s => {
        s.score *= 1.2;
      });
    }

    suggestions.sort((a, b) => b.score - a.score);

    const uniqueSuggestions: PatternSuggestion[] = [];
    const seenLabels = new Set<string>();
    
    for (const s of suggestions) {
      if (!seenLabels.has(s.label)) {
        seenLabels.add(s.label);
        uniqueSuggestions.push(s);
        if (uniqueSuggestions.length >= 6) break;
      }
    }

    return uniqueSuggestions;
    
  } catch (error) {
    console.error("Error getting personalized suggestions:", error);
    return [];
  }
}

export async function getUserCommandStats(
  organizationId: number,
  userId: string
): Promise<{
  totalCommands: number;
  successRate: number;
  favoriteCommand: string | null;
  favoriteClient: string | null;
  avgExecutionTime: number;
}> {
  try {
    const [stats] = await db.select({
      totalCommands: sql<number>`COUNT(*)::int`,
      successfulCommands: sql<number>`COUNT(*) FILTER (WHERE ${agentCommandHistory.wasSuccessful})::int`,
      avgExecutionTime: sql<number>`COALESCE(AVG(${agentCommandHistory.executionTimeMs}), 0)::int`,
    })
      .from(agentCommandHistory)
      .where(and(
        eq(agentCommandHistory.userId, userId),
        eq(agentCommandHistory.organizationId, organizationId)
      ));

    const [favoriteCmd] = await db.select({
      commandType: agentCommandHistory.commandType,
    })
      .from(agentCommandHistory)
      .where(and(
        eq(agentCommandHistory.userId, userId),
        eq(agentCommandHistory.organizationId, organizationId),
        eq(agentCommandHistory.wasSuccessful, true)
      ))
      .groupBy(agentCommandHistory.commandType)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(1);

    const [favoriteClientPattern] = await db.select({
      patternKey: userPatterns.patternKey,
    })
      .from(userPatterns)
      .where(and(
        eq(userPatterns.userId, userId),
        eq(userPatterns.organizationId, organizationId),
        eq(userPatterns.patternType, "client_frequency")
      ))
      .orderBy(desc(userPatterns.usageCount))
      .limit(1);

    let favoriteClientName: string | null = null;
    if (favoriteClientPattern) {
      const clientId = parseInt(favoriteClientPattern.patternKey.replace("client:", ""), 10);
      if (!isNaN(clientId)) {
        const [client] = await db.select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, clientId))
          .limit(1);
        favoriteClientName = client?.name || null;
      }
    }

    return {
      totalCommands: stats?.totalCommands || 0,
      successRate: stats?.totalCommands 
        ? Math.round((stats.successfulCommands / stats.totalCommands) * 100) 
        : 100,
      favoriteCommand: favoriteCmd?.commandType ? `/${favoriteCmd.commandType}` : null,
      favoriteClient: favoriteClientName,
      avgExecutionTime: stats?.avgExecutionTime || 0,
    };
  } catch (error) {
    console.error("Error getting user command stats:", error);
    return {
      totalCommands: 0,
      successRate: 100,
      favoriteCommand: null,
      favoriteClient: null,
      avgExecutionTime: 0,
    };
  }
}
