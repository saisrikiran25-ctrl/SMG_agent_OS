import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { ApprovalCentre } from './components/ApprovalCentre';
import { WorkflowTraces } from './components/WorkflowTraces';
import { LeadSimulator } from './components/LeadSimulator';
import { KnowledgeHub } from './components/KnowledgeHub';
import { EvaluationHarness } from './components/EvaluationHarness';
import { WorkspaceSettings } from './components/WorkspaceSettings';
import { ApiClient } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [session, setSession] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [latestEval, setLatestEval] = useState<any | null>(null);
  const [workspaceData, setWorkspaceData] = useState<any | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-authenticate or bootstrap tenant for instant demo
  useEffect(() => {
    bootstrapSession();
  }, []);

  const bootstrapSession = async () => {
    try {
      let auth = ApiClient.getAuth();
      if (!auth.token || !auth.tenantId) {
        // Auto-signup default demo tenant
        const signupRes = await ApiClient.signup({
          companyName: 'Sri Balaji Agro Supplies (Hyderabad)',
          name: 'Venkatesh Rao',
          email: 'venkatesh@balajiagro.in',
          password: 'Password123!',
          industry: 'Agri-Inputs & Distribution',
        });
        setSession(signupRes);
      }
      await refreshAllData();
    } catch (err) {
      console.error('Session bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    try {
      const [
        statsData,
        pendingApprovals,
        execList,
        docsList,
        evalData,
        wsData,
        teamData,
      ] = await Promise.all([
        ApiClient.getStats().catch(() => ({})),
        ApiClient.getPendingApprovals().catch(() => []),
        ApiClient.getExecutions().catch(() => []),
        ApiClient.getDocuments().catch(() => []),
        ApiClient.getLatestEvaluation().catch(() => null),
        ApiClient.getWorkspace().catch(() => ({})),
        ApiClient.getTeam().catch(() => []),
      ]);

      setStats(statsData);
      setApprovals(pendingApprovals);
      setExecutions(execList);
      setDocuments(docsList);
      setLatestEval(evalData);
      setWorkspaceData(wsData);
      setTeam(teamData);
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  };

  const handleApprovalAction = async (
    approvalId: string,
    action: string,
    notes?: string,
    editedContent?: any
  ) => {
    await ApiClient.performApprovalAction(approvalId, action, notes, editedContent);
    await refreshAllData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a11] flex items-center justify-center text-slate-400 font-medium text-sm">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Initializing SMB-Agent-OS Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col font-sans">
      <Navbar
        tenantName={workspaceData?.tenant?.name || 'Sri Balaji Agro Supplies'}
        userName={session?.user?.name || 'Venkatesh Rao'}
        userRole={session?.user?.role || 'Owner'}
        pendingCount={approvals.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingApprovalsCount={approvals.length}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardOverview stats={stats} onNavigate={setActiveTab} />
            )}

            {activeTab === 'approvals' && (
              <ApprovalCentre
                approvals={approvals}
                onAction={handleApprovalAction}
                onRefresh={refreshAllData}
              />
            )}

            {activeTab === 'workflows' && (
              <WorkflowTraces executions={executions} onRefresh={refreshAllData} />
            )}

            {activeTab === 'simulator' && (
              <LeadSimulator onLeadTriggered={refreshAllData} />
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeHub documents={documents} onRefresh={refreshAllData} />
            )}

            {activeTab === 'evaluations' && (
              <EvaluationHarness latestEval={latestEval} onRefresh={refreshAllData} />
            )}

            {activeTab === 'settings' && (
              <WorkspaceSettings
                team={team}
                workspaceData={workspaceData}
                onRefresh={refreshAllData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
