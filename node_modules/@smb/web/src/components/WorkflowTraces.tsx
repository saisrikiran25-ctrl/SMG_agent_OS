import React, { useState, useEffect } from 'react';
import {
  GitFork,
  CheckCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Eye,
  Shield,
  FileText,
  Activity,
  ChevronRight,
  Database,
} from 'lucide-react';
import { ApiClient } from '../api';

interface WorkflowTracesProps {
  executions: any[];
  onRefresh: () => void;
}

export const WorkflowTraces: React.FC<WorkflowTracesProps> = ({
  executions,
  onRefresh,
}) => {
  const [selectedExecId, setSelectedExecId] = useState<string | null>(
    executions[0]?.id || null
  );
  const [traceData, setTraceData] = useState<any | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (selectedExecId) {
      loadTrace(selectedExecId);
    }
  }, [selectedExecId]);

  const loadTrace = async (id: string) => {
    setLoadingTrace(true);
    try {
      const data = await ApiClient.getExecutionTrace(id);
      setTraceData(data);
    } catch (err) {
      console.error('Failed to load trace:', err);
    } finally {
      setLoadingTrace(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetrying(true);
    try {
      await ApiClient.retryExecution(id);
      await loadTrace(id);
      onRefresh();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'AWAITING_APPROVAL':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'PARTIALLY_COMPLETED':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'ESCALATED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'EXECUTING':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <GitFork className="w-6 h-6 text-indigo-400" />
            <span>Workflow Runs & Audit Trace Viewer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic state machine history, step timelines, and tamper-resistant audit logs (Section 15).
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700"
        >
          Refresh Runs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Executions List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Recent Executions ({executions.length})
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {executions.map((exec) => {
              const isSelected = selectedExecId === exec.id;
              const inputPayload = exec.input_payload || {};

              return (
                <div
                  key={exec.id}
                  onClick={() => setSelectedExecId(exec.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-150 border ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{exec.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        exec.status
                      )}`}
                    >
                      {exec.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium line-clamp-1 mt-2">
                    {inputPayload.message_text || 'Inbound Lead Request'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="capitalize">{exec.trigger_channel}</span>
                    <span>{new Date(exec.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Trace Inspection */}
        <div className="lg:col-span-8">
          {loadingTrace ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
              Loading execution trace...
            </div>
          ) : traceData ? (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-100 font-mono">
                      {traceData.execution?.id}
                    </h2>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        traceData.execution?.status
                      )}`}
                    >
                      {traceData.execution?.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Workflow: <span className="text-slate-300 font-medium">{traceData.execution?.workflow_id}</span> | Channel: <span className="text-slate-300 font-medium">{traceData.execution?.trigger_channel}</span>
                  </p>
                </div>

                {/* Partial Failure Retry Button */}
                {(traceData.execution?.status === 'PARTIALLY_COMPLETED' ||
                  traceData.execution?.status === 'FAILED_RETRYABLE') && (
                  <button
                    onClick={() => handleRetry(traceData.execution?.id)}
                    disabled={retrying}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-600/30 transition-all"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                    <span>{retrying ? 'Retrying...' : 'Retry Partial Failure'}</span>
                  </button>
                )}
              </div>

              {/* Step Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>Execution Step Timeline</span>
                </h3>

                <div className="space-y-2">
                  {traceData.steps?.map((step: any, idx: number) => (
                    <div
                      key={step.id || idx}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between text-xs"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200">{step.step_name}</span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] ${
                                step.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                          {step.error_message && (
                            <p className="text-rose-400 text-[11px] mt-1 font-mono">
                              Error: {step.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {step.started_at ? new Date(step.started_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted & Grounded Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-indigo-400 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4" />
                    <span>Extracted Lead Entities</span>
                  </div>
                  <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto p-2 bg-slate-900 rounded-lg">
                    {JSON.stringify(traceData.execution?.extracted_data, null, 2)}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                    <Database className="w-4 h-4" />
                    <span>Retrieved Knowledge Grounding</span>
                  </div>
                  <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto p-2 bg-slate-900 rounded-lg">
                    {JSON.stringify(traceData.execution?.context_data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Append-Only Audit Events Table */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Append-Only Audit Trail ({traceData.auditEvents?.length || 0} events)</span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3 text-right">Latency / Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {traceData.auditEvents?.map((ev: any) => (
                        <tr key={ev.id} className="hover:bg-slate-800/30 font-mono text-[11px]">
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-indigo-300">{ev.actor_type}</span>
                          </td>
                          <td className="py-2 px-3">{ev.event_type}</td>
                          <td className="py-2 px-3 text-emerald-400">{ev.action}</td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {ev.latency_ms ? `${ev.latency_ms}ms` : ''} {ev.cost_tokens ? `(${ev.cost_tokens} tok)` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
              Select an execution from the left to view trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
