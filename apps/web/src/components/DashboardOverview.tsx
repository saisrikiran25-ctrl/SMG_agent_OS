import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardOverviewProps {
  stats: any;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  onNavigate,
}) => {
  const summary = stats?.summary || {};
  const usage = stats?.usage || {};

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Human-Supervised Indian SMB AI Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Autonomous Inbound Lead & Sales Operations
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Multilingual WhatsApp qualification, instant knowledge base grounding, and strict human approval before any message is dispatched.
          </p>
          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
            >
              <span>Simulate New Lead</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('approvals')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
            >
              <span>View Approval Inbox ({summary.pendingApprovalsCount || 0})</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Leads Handled</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">{summary.totalLeadsProcessed || 0}</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% tenant-isolated processing</span>
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">
            {summary.pendingApprovalsCount || 0}
          </p>
          <p className="text-[11px] text-slate-400">Requires owner / manager review</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Workflow Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">
            {summary.successRatePercent || 100}%
          </p>
          <p className="text-[11px] text-slate-400">Deterministic state machine</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Estimated Cost Metering</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-sky-400">
            ${usage.total_cost_usd || '0.0000'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {usage.total_tokens || 0} tokens | {usage.total_messages || 0} msgs
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('knowledge')}
          className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Knowledge Hub (RAG)</h2>
          <p className="text-xs text-slate-400">
            {summary.knowledgeDocsCount || 1} catalogue items indexed. Grounding engine prevents hallucinated prices.
          </p>
        </div>

        <div
          onClick={() => onNavigate('workflows')}
          className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Audit Trail & Traces</h2>
          <p className="text-xs text-slate-400">
            Append-only audit events capture full step latency, cost, inputs, and tool executions.
          </p>
        </div>

        <div
          onClick={() => onNavigate('evaluations')}
          className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Safety & Eval Suite</h2>
          <p className="text-xs text-slate-400">
            10-point test set evaluating Telugu, Hindi, Tamil, Kannada, and prompt injection defense.
          </p>
        </div>
      </div>
    </div>
  );
};
