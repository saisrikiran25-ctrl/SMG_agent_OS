import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  GitFork,
  MessageSquarePlus,
  BookOpen,
  FlaskConical,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'approvals'
  | 'workflows'
  | 'simulator'
  | 'knowledge'
  | 'evaluations'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    {
      id: 'approvals',
      label: 'Approval Centre',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
    },
    { id: 'workflows', label: 'Workflow Runs & Traces', icon: GitFork },
    { id: 'simulator', label: 'Lead Inbound Simulator', icon: MessageSquarePlus },
    { id: 'knowledge', label: 'Knowledge Hub (RAG)', icon: BookOpen },
    { id: 'evaluations', label: 'Evaluation Harness', icon: FlaskConical },
    { id: 'settings', label: 'Workspace & RBAC', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspaces & Workflows
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Safety Baseline</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Approval gate enforced for all external messages. Append-only audit logs active.
        </p>
      </div>
    </aside>
  );
};
