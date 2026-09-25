import React, { useState } from 'react';
import {
  Settings,
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Key,
  Globe,
  Building,
} from 'lucide-react';
import { ApiClient } from '../api';

interface WorkspaceSettingsProps {
  team: any[];
  workspaceData: any;
  onRefresh: () => void;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
  team,
  workspaceData,
  onRefresh,
}) => {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales member');
  const [password, setPassword] = useState('Welcome123!');
  const [inviting, setInviting] = useState(false);

  const tenant = workspaceData?.tenant || {};
  const workspaces = workspaceData?.workspaces || [];
  const primaryWorkspace = workspaces[0] || {};

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await ApiClient.inviteMember({
        name,
        email,
        role,
        temporaryPassword: password,
      });
      setInviteModalOpen(false);
      setName('');
      setEmail('');
      onRefresh();
    } catch (err: any) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'Owner':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Admin':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Manager':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Sales member':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Support member':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            <span>Workspace Setup & RBAC Roles</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your tenant profile, workspace configuration, and team permissions (Section 13).
          </p>
        </div>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Tenant Profile & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
            <Building className="w-4 h-4" />
            <span>Tenant Information</span>
          </div>
          <p className="text-base font-bold text-white">{tenant.name || 'Sri Balaji Agro Supplies'}</p>
          <p className="text-xs text-slate-400">Tenant ID: <code className="font-mono text-indigo-300">{tenant.id}</code></p>
          <div className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Plan: {tenant.plan || 'Starter'}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-semibold">
            <Briefcase className="w-4 h-4" />
            <span>Primary Workspace</span>
          </div>
          <p className="text-base font-bold text-white">{primaryWorkspace.name || 'Primary Workspace'}</p>
          <p className="text-xs text-slate-400">Industry: <span className="text-slate-200">{primaryWorkspace.industry || 'Retail/Distribution'}</span></p>
          <p className="text-xs text-slate-400">Currency: <span className="text-emerald-400 font-bold">{primaryWorkspace.currency || 'INR (₹)'}</span></p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
            <Globe className="w-4 h-4" />
            <span>Supported Locales</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            English, Telugu (తెలుగు), Hindi (हिंदी), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Malayalam, Marathi, Bengali, Gujarati.
          </p>
          <p className="text-[10px] text-emerald-400 font-medium">Automatic language detection active</p>
        </div>
      </div>

      {/* RBAC Team Members Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>Team Members & Role-Based Access Control</span>
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-slate-800/30 text-xs">
                  <td className="py-2.5 px-4 font-semibold text-slate-200">{member.name}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{member.email}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-emerald-400 flex items-center space-x-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400">
                    {new Date(member.created_at || Date.now()).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteSubmit}
            className="glass-panel rounded-2xl max-w-md w-full p-6 space-y-4 border border-indigo-500/40"
          >
            <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>Invite New Team Member</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Naidu"
                required
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh@company.com"
                required
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Sales member">Sales member</option>
                <option value="Support member">Support member</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Temporary Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                {inviting ? 'Inviting...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
