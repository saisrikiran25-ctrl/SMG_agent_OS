import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabase } from '../db/database';
import { AuthService } from '../services/auth.service';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import { EvaluationRunner } from '../evaluation/eval_runner';

describe('Evaluation Harness & Baseline Metrics (Section 15 & 16)', () => {
  let db: MemoryDatabase;
  let authService: AuthService;
  let toolGateway: ToolGatewayService;
  let runtimeEngine: AgentRuntimeEngine;
  let evalRunner: EvaluationRunner;
  let tenantId: string;

  beforeEach(async () => {
    db = new MemoryDatabase();
    authService = new AuthService(db);
    toolGateway = new ToolGatewayService(db);
    runtimeEngine = new AgentRuntimeEngine(db, toolGateway);
    evalRunner = new EvaluationRunner(db, runtimeEngine);

    const session = await authService.signup({
      companyName: 'Deccan Agro Exports',
      name: 'Praveen',
      email: 'praveen@deccanagro.com',
      password: 'Password123!',
    });
    tenantId = session.tenant.id;
  });

  it('runs the comprehensive Phase 1 benchmark suite and produces grounded metrics', async () => {
    const report = await evalRunner.runSuite(tenantId, '1.0.0', '1.0.0');

    expect(report.total_tests).toBeGreaterThanOrEqual(10);
    expect(report.passed_tests).toBe(report.total_tests);
    expect(report.intent_extraction_accuracy).toBeGreaterThanOrEqual(0.85);
    expect(report.grounded_answer_rate).toBeGreaterThanOrEqual(0.9);
    expect(report.duplicate_action_rate).toBe(0.0);
    expect(report.workflow_completion_rate).toBe(1.0);
  });
});
