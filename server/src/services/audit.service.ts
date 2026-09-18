import { prisma } from "../server";

export class AuditService {
  static async log(
    action: string,
    actor: string,
    targetType: string,
    targetId: string,
    summary: string,
    actorName?: string
  ) {
    try {
      if ((prisma as any).auditEntry) {
        await (prisma as any).auditEntry.create({
          data: {
            action,
            actor,
            actorName: actorName || "Admin",
            targetType,
            targetId,
            summary
          }
        });
      }
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  }
}
