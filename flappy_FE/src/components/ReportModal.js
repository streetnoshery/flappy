import React, { useState } from 'react';
import { X, Flag, Send } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'];

const ReportModal = ({ isOpen, onClose, reportedUserId }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { toast.error('Please select a reason'); return; }
    setLoading(true);
    try {
      await reportsAPI.createReport({ reportedUserId, reason, description });
      toast.success('Report submitted. Thank you!');
      onClose();
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-card w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-slate-900">Report Issue</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            {REASONS.map(r => (
              <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === r ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="text-primary-600" />
                <span className="text-sm text-slate-700">{r}</span>
              </label>
            ))}
          </div>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Additional details (optional)…"
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
          />

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !reason} className="flex-1 btn-primary">
              {loading ? 'Submitting…' : <><Send className="w-3.5 h-3.5" /> Submit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
