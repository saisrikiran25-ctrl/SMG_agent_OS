import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { EvaluationReport } from '@smb/shared';

export interface EvaluationRecord {
  id: string;
  tenant_id: string;
  suite_name: string;
  prompt_version: string;
  agent_version: string;
  total_tests: number;
  passed_tests: number;
  metrics: Record<string, any>;
  raw_results: Record<string, any>;
  created_at?: string;
}

export class EvaluationRepository extends BaseRepository {
  async saveRun(
    tenantId: string,
    suiteName: string,
    report: EvaluationReport
  ): Promise<EvaluationRecord> {
    this.assertTenant(tenantId);
    const id = `eval_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<EvaluationRecord>(
      `INSERT INTO evaluations (
        id, tenant_id, suite_name, prompt_version, agent_version,
        total_tests, passed_tests, metrics, raw_results, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        id,
        tenantId,
        suiteName,
        report.prompt_version,
        report.agent_version,
        report.total_tests,
        report.passed_tests,
        JSON.stringify({
          intent_extraction_accuracy: report.intent_extraction_accuracy,
          classification_precision: report.classification_precision,
          classification_recall: report.classification_recall,
          grounded_answer_rate: report.grounded_answer_rate,
          tool_selection_accuracy: report.tool_selection_accuracy,
          human_escalation_rate: report.human_escalation_rate,
          approval_rejection_rate: report.approval_rejection_rate,
          workflow_completion_rate: report.workflow_completion_rate,
          duplicate_action_rate: report.duplicate_action_rate,
          avg_latency_ms: report.avg_latency_ms,
          avg_cost_tokens: report.avg_cost_tokens,
        }),
        JSON.stringify(report.results),
      ]
    );
    return rows[0];
  }

  async list(tenantId: string): Promise<EvaluationRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<EvaluationRecord>(
      `SELECT * FROM evaluations WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async getLatest(tenantId: string): Promise<EvaluationRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<EvaluationRecord>(
      `SELECT * FROM evaluations WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return rows[0] || null;
  }
}
