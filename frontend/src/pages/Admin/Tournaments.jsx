import { useState, useEffect, useCallback } from 'react';
import {
  getAdminTournaments,
  getAdminTournamentDetails,
  createTournament,
  updateTournament,
  startTournament,
  completeTournament,
  cancelTournament,
  deleteTournament,
  getTournamentParticipants,
  getTournamentRegistrations,
  approveRegistration,
  rejectRegistration,
} from '../../api/admin';
import toast from 'react-hot-toast';
import {
  Users, Search, X, Gamepad2, DollarSign, Clock,
  CheckCircle, XCircle, Loader2, Shield, Smartphone, Hash, RefreshCw,
} from 'lucide-react';

const statusLabels = {
  UPCOMING: 'Upcoming',
  REGISTRATION_OPEN: 'Registration Open',
  REGISTRATION_CLOSED: 'Registration Closed',
  ONGOING: 'Ongoing',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusColors = {
  UPCOMING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  REGISTRATION_OPEN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  REGISTRATION_CLOSED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ONGOING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_PROGRESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const GAME_CHOICES = [
  { value: 'FREE_FIRE', label: 'Free Fire' },
  { value: 'PUBG', label: 'PUBG' },
];

const MATCH_TYPE_CHOICES = [
  { value: 'SOLO', label: 'Solo' },
  { value: 'DUO', label: 'Duo' },
  { value: 'SQUAD', label: 'Squad' },
];

const STATUS_CHOICES = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
  { value: 'REGISTRATION_CLOSED', label: 'Registration Closed' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const emptyForm = {
  title: '',
  game_name: 'FREE_FIRE',
  match_type: 'SOLO',
  description: '',
  entry_fee: '',
  prize_pool: '',
  start_time: '',
  total_slots: 16,
  rules: '',
  is_active: true,
  status: 'UPCOMING',
  banner: null,
};

/* ─── Tournament Form Modal ─── */
function TournamentFormModal({ isOpen, onClose, onSubmit, initialData, isEdit }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setForm({
        title: initialData.title || '',
        game_name: initialData.game_name || 'FREE_FIRE',
        match_type: initialData.match_type || 'SOLO',
        description: initialData.description || '',
        entry_fee: initialData.entry_fee ?? '',
        prize_pool: initialData.prize_pool ?? '',
        start_time: initialData.start_time
          ? new Date(initialData.start_time).toISOString().slice(0, 16)
          : '',
        total_slots: initialData.total_slots || initialData.slots_available || 16,
        rules: initialData.rules || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
        status: initialData.status || 'UPCOMING',
        banner: null,
      });
    } else if (isOpen && !initialData) {
      setForm(emptyForm);
    }
    setErrors({});
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      setForm((prev) => ({ ...prev, [name]: files[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('game_name', form.game_name);
    formData.append('match_type', form.match_type);
    formData.append('description', form.description);
    formData.append('entry_fee', form.entry_fee);
    formData.append('prize_pool', form.prize_pool);
    formData.append('start_time', new Date(form.start_time).toISOString());
    formData.append('total_slots', form.total_slots);
    formData.append('rules', form.rules);
    formData.append('is_active', form.is_active);
    if (isEdit) {
      formData.append('status', form.status);
    }
    if (form.banner) {
      formData.append('banner', form.banner);
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp && typeof resp === 'object') {
        setErrors(resp);
      }
      toast.error(isEdit ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fieldError = (field) =>
    errors[field] ? (
      <p className="text-xs text-red-500 mt-1">
        {Array.isArray(errors[field]) ? errors[field].join(' ') : errors[field]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? '✏️ Edit Tournament' : '🏆 Create New Tournament'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter tournament name"
            />
            {fieldError('title')}
          </div>

          {/* Game, Match Type & Slots */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Game *
              </label>
              <select
                name="game_name"
                value={form.game_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {GAME_CHOICES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {fieldError('game_name')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Match Type *
              </label>
              <select
                name="match_type"
                value={form.match_type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {MATCH_TYPE_CHOICES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {fieldError('match_type')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Slots *
              </label>
              <select
                name="total_slots"
                value={form.total_slots}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {[2, 4, 8, 16, 32, 64, 128].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {fieldError('total_slots')}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter tournament description"
            />
            {fieldError('description')}
          </div>

          {/* Entry Fee & Prize Pool */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entry Fee ($) *
              </label>
              <input
                type="number"
                name="entry_fee"
                value={form.entry_fee}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              {fieldError('entry_fee')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prize Pool ($) *
              </label>
              <input
                type="number"
                name="prize_pool"
                value={form.prize_pool}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              {fieldError('prize_pool')}
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time *
            </label>
            <input
              type="datetime-local"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            {fieldError('start_time')}
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_CHOICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {fieldError('status')}
            </div>
          )}

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rules
            </label>
            <textarea
              name="rules"
              value={form.rules}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter tournament rules"
            />
            {fieldError('rules')}
          </div>

          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tournament Banner
            </label>
            <input
              type="file"
              name="banner"
              onChange={handleChange}
              accept="image/*"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            {fieldError('banner')}
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Non-field errors */}
          {errors.non_field_errors && (
            <p className="text-sm text-red-500">
              {Array.isArray(errors.non_field_errors)
                ? errors.non_field_errors.join(' ')
                : errors.non_field_errors}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              )}
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Participants Modal ─── */
function ParticipantsModal({ isOpen, onClose, tournamentId, tournamentTitle, onSlotUpdate }) {
  const [registrations, setRegistrations] = useState([]);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // tracks which row is being actioned

  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchRegistrations();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setRegistrations([]);
      setTournamentInfo(null);
      setSearch('');
      setStatusFilter('');
      setActionLoading(null);
    }
  }, [isOpen, tournamentId, search, statusFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.payment_status = statusFilter;
      const res = await getTournamentRegistrations(tournamentId, params);
      setRegistrations(res.data.results);
      setTournamentInfo(res.data.tournament);
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  // ── Approve handler ────────────────────────────────────────────
  const handleApprove = async (registrationId) => {
    setActionLoading(registrationId);
    try {
      await approveRegistration(registrationId);
      toast.success('Registration approved! Slot incremented.');

      // Update local state: change status to APPROVED, remove action buttons
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId ? { ...r, payment_status: 'APPROVED' } : r
        )
      );

      // Update tournament info slot count locally for instant UI feedback
      setTournamentInfo((prev) =>
        prev ? { ...prev, slots_filled: prev.slots_filled + 1 } : prev
      );

      // Notify parent to refresh dashboard counter
      onSlotUpdate?.(tournamentId);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Failed to approve registration.';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject handler ─────────────────────────────────────────────
  const handleReject = async (registrationId) => {
    // Prompt for optional rejection reason
    const reason = window.prompt('Rejection reason (optional):', '');
    // If user cancels the prompt, abort
    if (reason === null) return;

    setActionLoading(registrationId);
    try {
      await rejectRegistration(registrationId, reason);
      toast.success('Registration rejected.');

      // Update local state: change status to REJECTED
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId
            ? { ...r, payment_status: 'REJECTED', rejection_reason: reason || 'Rejected by admin' }
            : r
        )
      );
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Failed to reject registration.';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  // Status badge colors for the new registration statuses
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusLabels = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };

  // Payment method badge colors
  const methodColors = {
    BKASH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ROCKET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const methodIcons = {
    BKASH: '💜',
    ROCKET: '🔵',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              💳 Payment Registrations
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tournamentTitle} — Review &amp; approve manual payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRegistrations}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Tournament Info Bar ──────────────────────────────── */}
        {tournamentInfo && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{tournamentInfo.slots_filled}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Slots</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{tournamentInfo.slots_available}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Game</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{tournamentInfo.game_name}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {tournamentInfo.slots_available - tournamentInfo.slots_filled}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="px-6 pt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username, TxID, or sender number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">⏳ Pending</option>
            <option value="APPROVED">✅ Approved</option>
            <option value="REJECTED">❌ Rejected</option>
          </select>
        </div>

        {/* ── Registrations Table ─────────────────────────────── */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No registrations found</p>
              <p className="text-sm mt-1">Users who submit manual payments will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-700">
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">#</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Sender Number</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Method</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">TxID</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Submitted</th>
                    <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => {
                    const isPending = reg.payment_status === 'PENDING';
                    const isActioning = actionLoading === reg.id;

                    return (
                      <tr
                        key={reg.id}
                        className={`border-b border-gray-100 dark:border-dark-700/50 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors ${
                          isPending ? 'bg-yellow-50/40 dark:bg-yellow-900/5' : ''
                        }`}
                      >
                        {/* # */}
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* User */}
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {reg.user?.username || reg.user || '—'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {reg.user?.email || ''}
                            </p>
                          </div>
                        </td>

                        {/* Sender Number */}
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                            <Smartphone className="w-3 h-3 text-gray-400" />
                            {reg.sender_number || '—'}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${methodColors[reg.payment_method] || ''}`}>
                            {methodIcons[reg.payment_method] || '💳'} {reg.payment_method}
                          </span>
                        </td>

                        {/* TxID */}
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded">
                            <Hash className="w-3 h-3 text-gray-400" />
                            {reg.transaction_id || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[reg.payment_status] || ''}`}>
                            {statusLabels[reg.payment_status] || reg.payment_status}
                          </span>
                        </td>

                        {/* Submitted At */}
                        <td className="py-3 px-2 text-xs text-gray-500 dark:text-gray-400">
                          {reg.created_at
                            ? new Date(reg.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>

                        {/* Actions — only for PENDING */}
                        <td className="py-3 px-2">
                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApprove(reg.id)}
                                disabled={isActioning}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                                  bg-green-600 text-white hover:bg-green-700
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors shadow-sm"
                              >
                                {isActioning ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(reg.id)}
                                disabled={isActioning}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                                  bg-red-600 text-white hover:bg-red-700
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors shadow-sm"
                              >
                                {isActioning ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {reg.payment_status === 'APPROVED' ? '—' : reg.rejection_reason || '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="px-6 pb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
            {statusFilter ? ` (${statusFilter.toLowerCase()})` : ''}
          </span>
          <span>
            Approve = slot +1 • Reject = no slot change
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  // Participants modal state
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantsTournamentId, setParticipantsTournamentId] = useState(null);
  const [participantsTournamentTitle, setParticipantsTournamentTitle] = useState('');

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await getAdminTournaments(params);
      setTournaments(res.data.results);
      setTotalPages(res.data.total_pages);
      setTotal(res.data.count);
    } catch {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleCreate = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleEdit = async (id) => {
    try {
      const res = await getAdminTournamentDetails(id);
      setEditData(res.data);
      setShowModal(true);
    } catch {
      toast.error('Failed to load tournament details');
    }
  };

  const handleFormSubmit = async (formData) => {
    if (editData) {
      await updateTournament(editData.id, formData);
      toast.success('Tournament updated');
    } else {
      await createTournament(formData);
      toast.success('Tournament created');
    }
    fetchTournaments();
  };

  const handleStart = async (id, name) => {
    if (!confirm(`Do you want to start the "${name}" tournament?`)) return;
    try {
      await startTournament(id);
      toast.success('Tournament started');
      fetchTournaments();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleComplete = async (id, name) => {
    if (!confirm(`Do you want to complete the "${name}" tournament?`)) return;
    try {
      await completeTournament(id);
      toast.success('Tournament completed');
      fetchTournaments();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleCancel = async (id, name) => {
    if (!confirm(`Do you want to cancel the "${name}" tournament?`)) return;
    try {
      await cancelTournament(id);
      toast.success('Tournament cancelled');
      fetchTournaments();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Do you want to delete the "${name}" tournament?`)) return;
    try {
      await deleteTournament(id);
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch {
      toast.error('An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏆 Tournament Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Total {total} tournaments</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors"
        >
          <span className="text-lg">+</span> New Tournament
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="REGISTRATION_OPEN">Registration Open</option>
          <option value="REGISTRATION_CLOSED">Registration Closed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{tournament.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tournament.game_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[tournament.status]}`}>
                  {statusLabels[tournament.status]}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                {tournament.description}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Participants</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {tournament.participants_count}/{tournament.slots_available}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Prize</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    ${tournament.prize_pool}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Start: {new Date(tournament.start_time).toLocaleDateString('en-US')}</span>
                <span>•</span>
                <span>End: {new Date(tournament.start_time).toLocaleDateString('en-US')}</span>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                {/* View Participants button */}
                <button
                  onClick={() => {
                    setParticipantsTournamentId(tournament.id);
                    setParticipantsTournamentTitle(tournament.title);
                    setShowParticipants(true);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400"
                >
                  👥 Participants ({tournament.participants_count})
                </button>
                {/* Edit button */}
                <button
                  onClick={() => handleEdit(tournament.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  ✏️ Edit
                </button>
                {tournament.status === 'UPCOMING' && (
                  <button
                    onClick={() => handleStart(tournament.id, tournament.title)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                  >
                    ▶️ Start
                  </button>
                )}
                {tournament.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleComplete(tournament.id, tournament.title)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    ✅ Complete
                  </button>
                )}
                {(tournament.status === 'UPCOMING' || tournament.status === 'IN_PROGRESS' || tournament.status === 'REGISTRATION_OPEN') && (
                  <button
                    onClick={() => handleCancel(tournament.id, tournament.title)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                  >
                    ❌ Cancel
                  </button>
                )}
                <button
                  onClick={() => handleDelete(tournament.id, tournament.title)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tournaments.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No tournaments found
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <TournamentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleFormSubmit}
        initialData={editData}
        isEdit={!!editData}
      />

      {/* Participants Modal */}
      <ParticipantsModal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        tournamentId={participantsTournamentId}
        tournamentTitle={participantsTournamentTitle}
        onSlotUpdate={() => fetchTournaments()}
      />
    </div>
  );
}
