import React, { useState } from 'react';
import {
  CheckSquare,
  Check,
  X,
  Edit3,
  AlertTriangle,
  Send,
  Database,
  DollarSign,
  User,
  Clock,
  Sparkles,
  MessageCircle,
} from 'lucide-react';

interface ApprovalCentreProps {
  approvals: any[];
  onAction: (approvalId: string, action: string, notes?: string, editedContent?: any) => Promise<void>;
  onRefresh: () => void;
}

export const ApprovalCentre: React.FC<ApprovalCentreProps> = ({
  approvals,
  onAction,
  onRefresh,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleOpenEdit = (item: any) => {
    setSelectedApproval(item);
    setEditedText(item.generated_content?.message_text || '');
    setEditModalOpen(true);
  };

  const handleApprove = async (id: string) => {
    setLoadingAction(id);
    try {
      await onAction(id, 'APPROVE', reviewNotes);
      onRefresh();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveEditAndApprove = async () => {
    if (!selectedApproval) return;
    setLoadingAction(selectedApproval.id);
    try {
      const editedContent = {
        ...selectedApproval.generated_content,
        message_text: editedText,
      };
      await onAction(selectedApproval.id, 'EDIT_AND_APPROVE', reviewNotes, editedContent);
      setEditModalOpen(false);
      onRefresh();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingAction(id);
    try {
      await onAction(id, 'REJECT', reviewNotes || 'Rejected by reviewer');
      onRefresh();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setLoadingAction(id);
    try {
      await onAction(id, 'ESCALATE', reviewNotes || 'Escalated to management');
      onRefresh();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <CheckSquare className="w-6 h-6 text-indigo-400" />
            <span>Approval Centre</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Human-in-the-loop security gate. No external message or financial action is dispatched without explicit approval.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700"
        >
          Refresh Inbox
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">Inbox is Clear</h3>
          <p className="text-xs text-slate-400">
            All pending agent follow-ups and actions have been reviewed and approved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {approvals.map((item) => {
            const dataUsed = item.data_used || {};
            const content = item.generated_content || {};
            const lead = dataUsed.lead_extraction || {};
            const isLoading = loadingAction === item.id;

            return (
              <div
                key={item.id}
                className="glass-panel-glow rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 space-y-5"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/30">
                        {item.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Execution: {item.execution_id}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-100">{item.action_description}</h2>
                    <p className="text-xs text-slate-400 flex items-center space-x-2">
                      <span>Reason: {item.reason}</span>
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-400 space-y-1">
                    <div className="flex items-center justify-end space-x-1 text-emerald-400 font-mono">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Est. Cost: ${item.estimated_cost_usd || '0.0050'}</span>
                    </div>
                    <div className="flex items-center justify-end space-x-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Inspection View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Data Used (Grounded Evidence) */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-sky-400">
                      <Database className="w-4 h-4" />
                      <span>Data Used by Agent</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Product:</span>
                        <span className="font-medium text-slate-200">{lead.product || 'Unspecified'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Quantity:</span>
                        <span className="font-medium text-slate-200">{lead.quantity ? `${lead.quantity} units` : 'Unspecified'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Delivery Location:</span>
                        <span className="font-medium text-slate-200">{lead.delivery_location || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Verified Knowledge:</span>
                        <span className="font-medium text-emerald-400">
                          {dataUsed.verified_products?.join(', ') || 'Catalogue matched'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Generated Message Draft */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Generated Draft (WhatsApp)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">To: {content.recipient}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {content.message_text}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tool to call on approve: <code className="text-indigo-300 font-mono">{item.tool_to_call}</code></span>
                    </div>
                  </div>
                </div>

                {/* Decision Actions Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    Reviewer actions adhere to strict human-in-the-loop validation.
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleEscalate(item.id)}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Escalate</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit & Approve</span>
                    </button>

                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Processing...' : 'Approve & Send'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit & Approve Modal */}
      {editModalOpen && selectedApproval && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-xl w-full p-6 space-y-4 border border-indigo-500/40">
            <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              <span>Edit Draft Before Approval</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Customer Message Text
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 rounded-xl p-3 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Reviewer Notes (Optional)
              </label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Corrected delivery timeline per manager discussion"
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditAndApprove}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                Save & Dispatch Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
