import React from 'react';
import { ShieldCheck, UserCheck, Layers, Bell } from 'lucide-react';

interface NavbarProps {
  tenantName: string;
  userName: string;
  userRole: string;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenantName,
  userName,
  userRole,
  pendingCount,
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              SMB-Agent-OS
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 1 MVP
            </span>
          </div>
          <p className="text-xs text-slate-400">{tenantName || 'Balaji Agro Enterprise'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Isolation Guard Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tenant Isolated</span>
        </div>

        {/* Pending Approval Indicator */}
        {pendingCount > 0 && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse">
            <Bell className="w-3.5 h-3.5" />
            <span>{pendingCount} Pending Approvals</span>
          </div>
        )}

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{userName || 'Ravi Kumar'}</p>
            <p className="text-[11px] text-indigo-400 font-medium">{userRole || 'Owner'}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
            <UserCheck className="w-4 h-4 text-slate-300" />
          </div>
        </div>
      </div>
    </header>
  );
};
