import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  AlertOctagon,
  FileText,
  Database,
  Plus,
} from 'lucide-react';
import { ApiClient } from '../api';

interface KnowledgeHubProps {
  documents: any[];
  onRefresh: () => void;
}

export const KnowledgeHub: React.FC<KnowledgeHubProps> = ({ documents, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('catalogue');
  const [verificationStatus, setVerificationStatus] = useState('verified');
  const [rawContent, setRawContent] = useState('');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await ApiClient.searchKnowledge(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string) => {
    try {
      await ApiClient.updateDocStatus(docId, newStatus);
      onRefresh();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await ApiClient.uploadDocument({
        title,
        category,
        verification_status: verificationStatus,
        raw_content: rawContent,
        metadata: {
          product_name: title,
          price: price ? parseFloat(price) : undefined,
          currency: 'INR',
        },
      });

      setUploadModalOpen(false);
      setTitle('');
      setRawContent('');
      setPrice('');
      onRefresh();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>Knowledge Hub (RAG & Grounding)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verified catalogues, price lists, and business policies. The agent never invents unverified facts (Section 3.5).
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge / Catalogue</span>
        </button>
      </div>

      {/* RAG Search Bench */}
      <form onSubmit={handleSearch} className="glass-panel rounded-2xl p-4 border border-slate-800 flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Test semantic RAG retrieval (e.g. 'Organic Fertilizer', 'Rice 25kg price', 'Saree delivery')..."
            className="w-full bg-slate-950 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
        >
          {searching ? 'Searching...' : 'Search RAG'}
        </button>
      </form>

      {/* Search Results Display */}
      {searchResults && (
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span>RAG Query Results ({searchResults.length} matched items)</span>
            <button
              onClick={() => setSearchResults(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline"
            >
              Clear Results
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((res: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-slate-100">
                  <span>{res.name}</span>
                  <span className="text-emerald-400">₹{res.price}</span>
                </div>
                <p className="text-[11px] text-slate-400">{res.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Doc ID: {res.source_document_id}</span>
                  <span className="text-emerald-400 uppercase font-semibold">{res.verification_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
                  {doc.category}
                </span>
                <select
                  value={doc.verification_status}
                  onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border bg-slate-950 focus:outline-none ${
                    doc.verification_status === 'verified'
                      ? 'text-emerald-400 border-emerald-500/40'
                      : doc.verification_status === 'draft'
                      ? 'text-amber-400 border-amber-500/40'
                      : 'text-rose-400 border-rose-500/40'
                  }`}
                >
                  <option value="verified">Verified</option>
                  <option value="draft">Draft</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <h2 className="text-sm font-bold text-slate-100">{doc.title}</h2>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {doc.raw_content}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Chunks Indexed</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="glass-panel rounded-2xl max-w-lg w-full p-6 space-y-4 border border-indigo-500/40"
          >
            <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span>Add Knowledge Document</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Document Title / Product</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sona Masoori Rice Wholesale Price Sheet"
                required
                className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800"
                >
                  <option value="catalogue">Product Catalogue</option>
                  <option value="price_list">Price List</option>
                  <option value="service_descriptions">Service Description</option>
                  <option value="basic_faqs">FAQ</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Unit Price (₹ INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 border border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Content / Specs / Details</label>
              <textarea
                rows={4}
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Enter product description, specs, availability, MOQ, and terms..."
                required
                className="w-full bg-slate-950 rounded-xl p-3 text-xs text-slate-200 border border-slate-800 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                {uploading ? 'Processing Chunks...' : 'Save & Index Knowledge'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
