import {
  WorkflowExecutionRepository,
  AuditRepository,
  TenantRepository,
} from '../../api/src/repositories';
import { AgentRuntimeEngine } from '../../api/src/engine/agent_runtime';
import { ToolGatewayService } from '../../api/src/tools/tool_gateway';
import { getDatabase } from '../../api/src/db/database';

const MAX_RETRIES = 3;
const RETRY_ELIGIBLE_STATUSES = ['FAILED_RETRYABLE', 'PARTIALLY_COMPLETED'] as const;

export class BackgroundWorker {
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private db = getDatabase();
  private execRepo = new WorkflowExecutionRepository(this.db);
  private auditRepo = new AuditRepository(this.db);
  private tenantRepo = new TenantRepository(this.db);
  private toolGateway = new ToolGatewayService(this.db);
  private runtime = new AgentRuntimeEngine(this.db, this.toolGateway);

  start(pollIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Worker] Started background polling loop (interval: ${pollIntervalMs}ms)`);

    this.intervalTimer = setInterval(() => {
      this.tick().catch((err) => console.error('[Worker] Error in tick:', err));
    }, pollIntervalMs);
  }

  stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('[Worker] Stopped background loop');
  }

  /**
   * Background tick: scans all tenants for FAILED_RETRYABLE / PARTIALLY_COMPLETED
   * executions that have retry_count < MAX_RETRIES and re-triggers them.
   * This implements the retry recovery leg from Section 10 of the spec.
   */
  async tick() {
    // Get all active tenants
    const tenants = await this.tenantRepo.listAll();

    for (const tenant of tenants) {
      try {
        // Fetch all executions in retry-eligible states for this tenant
        const allExecs = await this.execRepo.list(tenant.id, 100);
        const retryable = allExecs.filter(
          (e) =>
            (RETRY_ELIGIBLE_STATUSES as readonly string[]).includes(e.status) &&
            (e.retry_count || 0) < MAX_RETRIES
        );

        for (const exec of retryable) {
          try {
            console.log(
              `[Worker] Retrying execution ${exec.id} for tenant ${tenant.id} ` +
              `(status=${exec.status}, retry=${exec.retry_count || 0})`
            );

            await this.auditRepo.append({
              tenant_id: tenant.id,
              execution_id: exec.id,
              workflow_id: exec.workflow_id,
              actor_type: 'system',
              event_type: 'worker_retry',
              action: 'background_retry_attempt',
              inputs: { retry_count: (exec.retry_count || 0) + 1, status: exec.status },
            });

            const result = await this.runtime.retryPartialFailure(tenant.id, exec.id);

            console.log(
              `[Worker] Retry result for ${exec.id}: ${result.status}`
            );
          } catch (execErr: any) {
            console.error(
              `[Worker] Retry failed for execution ${exec.id}: ${execErr.message}`
            );

            // If retry count would exceed MAX_RETRIES, mark as FAILED_PERMANENT
            const currentRetry = (exec.retry_count || 0) + 1;
            if (currentRetry >= MAX_RETRIES) {
              await this.execRepo.updateStatus(tenant.id, exec.id, 'FAILED_PERMANENT', {
                error_message: `Max retries (${MAX_RETRIES}) exhausted. Last error: ${execErr.message}`,
              });

              await this.auditRepo.append({
                tenant_id: tenant.id,
                execution_id: exec.id,
                workflow_id: exec.workflow_id,
                actor_type: 'system',
                event_type: 'worker_max_retries_exceeded',
                action: 'mark_failed_permanent',
                inputs: { retry_count: currentRetry, max_retries: MAX_RETRIES },
                outputs: { error: execErr.message },
              });
            }
          }
        }
      } catch (tenantErr: any) {
        console.error(`[Worker] Error processing tenant ${tenant.id}: ${tenantErr.message}`);
      }
    }
  }
}

