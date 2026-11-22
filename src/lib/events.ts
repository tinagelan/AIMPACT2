import "server-only";
import { db } from "./db";

export type EventName =
  | "diagnosis_started"
  | "step_completed"
  | "report_reached"
  | "upgrade_clicked"
  | "upgrade_converted"
  | "pdf_exported"
  | "recommendation_implemented";

export async function track(name: EventName, opts: { userId?: string; diagnosisId?: string; props?: Record<string, unknown> } = {}) {
  try {
    await db.event.create({
      data: { name, userId: opts.userId, diagnosisId: opts.diagnosisId, propsJson: JSON.stringify(opts.props ?? {}) },
    });
  } catch (e) {
    console.error("[events] failed to record", name, e);
  }
}
