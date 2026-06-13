import { useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, Trophy, Clock, Users, DollarSign,
  Smartphone, Hash, CheckCircle, AlertCircle, Copy, Shield,
  Loader2, Info, Send, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';

/* ═══════════════════════════════════════════════════════════════════
 * JoinTournamentModal
 *
 * A local overlay modal for manual payment tournament registration.
 * Does NOT immediately join the user — instead it:
 *   1. Collects player info (IGN, UID) and payment details
 *   2. POSTs to /api/tournaments/registrations/ with status PENDING
 *   3. Shows a "pending admin approval" success state
 *
 * Props:
 *   tournament  – the tournament object
 *   isOpen      – boolean, controls visibility
 *   onClose     – callback when modal closes
 *   onSuccess   – callback after successful submission
 * ═══════════════════════════════════════════════════════════════════ */

const ADMIN_PAYMENT_NUMBER = '01834775351'; // bKash & Rocket personal number

const JoinTournamentModal = ({ tournament, isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);          // 1 = player info, 2 = payment, 3 = success
  const [loading, setLoading] = useState(false);

  // ── Player fields ──────────────────────────────────────────────
  const [playerIgn, setPlayerIgn] = useState('');
  const [playerUid, setPlayerUid] = useState('');

  // ── Payment fields ─────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('BKASH');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // ── Submitted TxID (shown on success step) ────────────────────
  const [submittedTxId, setSubmittedTxId] = useState('');

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────
  const getGameIcon = (game) => ({ FREE_FIRE: '🔥', PUBG: '🪖' }[game] || '🎮');
  const getPaymentIcon = (m) => ({ BKASH: '💜', ROCKET: '🔵' }[m] || '💳');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // ── Validation ─────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!playerIgn.trim()) { toast.error('Please enter your In-Game Name.'); return false; }
    if (!playerUid.trim()) { toast.error('Please enter your Game UID.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!senderNumber.trim() || senderNumber.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid sender mobile number (min 10 digits).');
      return false;
    }
    if (!transactionId.trim() || transactionId.trim().length < 5) {
      toast.error('Please enter a valid Transaction ID (min 5 characters).');
      return false;
    }
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload = {
        tournament: tournament.id,
        player_game_ids: {
          player1: { ign: playerIgn.trim(), uid: playerUid.trim() },
        },
        payment_method: paymentMethod,
        sender_number: senderNumber.trim(),
        transaction_id: transactionId.trim(),
      };

      const response = await apiClient.post('/tournaments/registrations/', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSubmittedTxId(transactionId.trim());
      setStep(3);
      onSuccess?.(response.data);
    } catch (err) {
      const data = err?.response?.data;

      // Django returns field-level errors as { field: ["error", ...] }
      // or non_field_errors for general errors
      if (data && typeof data === 'object') {
        // Collect all field-level errors into a single message
        const fieldErrors = Object.entries(data)
          .filter(([key]) => key !== 'non_field_errors')
          .map(([field, msgs]) => {
            const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const text = Array.isArray(msgs) ? msgs[0] : String(msgs);
            return `${label}: ${text}`;
          });

        if (fieldErrors.length > 0) {
          toast.error(fieldErrors.join(' • '), { duration: 6000 });
        } else if (data.non_field_errors) {
          toast.error(Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors);
        } else {
          toast.error('Registration failed. Please check your inputs.');
        }
      } else {
        toast.error('Failed to submit registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2) { handleSubmit(); return; }
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleClose = () => {
    // Reset all state
    setStep(1);
    setPlayerIgn('');
    setPlayerUid('');
    setPaymentMethod('BKASH');
    setSenderNumber('');
    setTransactionId('');
    setSubmittedTxId('');
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-700">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 p-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getGameIcon(tournament.game_name)}</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {step === 3 ? 'Registration Submitted!' : 'Join Tournament'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tournament.title} &bull; {tournament.match_type}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
                    : s < step ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-dark-700'
                }`}>
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
                  {s === 1 ? 'Player Info' : s === 2 ? 'Payment' : 'Status'}
                </span>
                {s < 3 && (
                  <div className="flex-1 h-0.5 bg-gray-200 dark:bg-dark-700">
                    <div className={`h-full transition-all duration-300 ${s < step ? 'bg-green-500 w-full' : 'bg-transparent w-0'}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="p-4 md:p-6">

          {/* Tournament summary — visible on all steps */}
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-3 mb-5 border border-gray-200 dark:border-dark-600">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">৳{parseFloat(tournament.entry_fee).toLocaleString()}</p>
              </div>
              <div>
                <Trophy className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Prize Pool</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">৳{parseFloat(tournament.prize_pool).toLocaleString()}</p>
              </div>
              <div>
                <Users className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Slots</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {(tournament.slots_left !== undefined ? tournament.slots_left : tournament.total_slots - (tournament.joined_slots || 0))}/{tournament.total_slots}
                </p>
              </div>
            </div>
          </div>

          {/* ── Step 1: Player Info ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Player Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  In-Game Name (IGN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={playerIgn}
                  onChange={(e) => setPlayerIgn(e.target.value)}
                  placeholder="e.g., ProGamer123"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Game UID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={playerUid}
                  onChange={(e) => setPlayerUid(e.target.value)}
                  placeholder="e.g., 1234567890"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Payment ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                Payment Details
              </h3>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-500/10 dark:border-blue-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">How to pay:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open your bKash / Rocket app and send <strong>৳{parseFloat(tournament.entry_fee).toLocaleString()}</strong> to the admin number below.</li>
                      <li>Copy the <strong>Transaction ID (TxID)</strong> from the confirmation SMS.</li>
                      <li>Select your method, enter your number &amp; TxID, then submit.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {['BKASH', 'ROCKET'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === m
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 shadow-md shadow-cyan-500/10'
                          : 'border-gray-200 hover:border-gray-300 dark:border-dark-600 dark:hover:border-dark-500'
                      }`}
                    >
                      <span className="text-2xl">{getPaymentIcon(m)}</span>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                        {m === 'BKASH' ? 'bKash' : 'Rocket'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin number card */}
              <div className="bg-gradient-to-br from-green-50 via-cyan-50 to-blue-50 dark:from-green-500/10 dark:via-cyan-500/10 dark:to-blue-500/10 border-2 border-green-300 dark:border-green-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                    Send Money to Admin
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {paymentMethod === 'BKASH' ? 'bKash' : 'Rocket'} Personal Number:
                </p>
                <div className="flex items-center justify-between bg-white dark:bg-dark-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-dark-600">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getPaymentIcon(paymentMethod)}</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                      {ADMIN_PAYMENT_NUMBER}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ADMIN_PAYMENT_NUMBER)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Account Type: Personal &bull; Send exactly ৳{parseFloat(tournament.entry_fee).toLocaleString()}
                </p>
              </div>

              {/* Sender number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your {paymentMethod === 'BKASH' ? 'bKash' : 'Rocket'} Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                  />
                </div>
              </div>

              {/* TxID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID (TxID) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g., 8KX9ABC123"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Find this in your {paymentMethod === 'BKASH' ? 'bKash' : 'Rocket'} transaction history / SMS.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-500/10 dark:border-yellow-500/20">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Make sure you have <strong>already sent</strong> the money before submitting.
                    Your registration will be reviewed by an admin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Success / Pending ─────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="bg-gradient-to-br from-green-50 to-cyan-50 dark:from-green-500/10 dark:to-cyan-500/10 border-2 border-green-300 dark:border-green-500/30 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Request Submitted!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Waiting for admin verification.
                </p>
              </div>

              {/* Pending badge */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-500/10 dark:border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      ⏳ Pending Admin Approval
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      TxID <strong className="font-mono">{submittedTxId}</strong> is being verified.
                      Room details will appear once approved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4 border border-gray-200 dark:border-dark-600 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Tournament</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tournament.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Player</span>
                  <span className="font-medium text-gray-900 dark:text-white">{playerIgn} (#{playerUid})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Method</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getPaymentIcon(paymentMethod)} {paymentMethod === 'BKASH' ? 'bKash' : 'Rocket'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="font-bold text-green-600 dark:text-green-400">৳{parseFloat(tournament.entry_fee).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">TxID</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">{submittedTxId}</span>
                </div>
              </div>

              {/* Next steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-500/10 dark:border-blue-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Admin will verify your payment (usually within 24 hours).</li>
                      <li>Once approved, room ID &amp; password will appear in your tournament status.</li>
                      <li>You&apos;ll receive a notification when processed.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 p-4 rounded-b-2xl">
          <div className="flex items-center justify-between">
            {step > 1 && step < 3 ? (
              <button onClick={handleBack} disabled={loading}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step === 1 && (
              <button onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/25">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25">
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>)
                  : (<><Send className="w-4 h-4" /> Submit Payment</>)}
              </button>
            )}

            {step === 3 && (
              <button onClick={handleClose}
                className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/25">
                Done <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinTournamentModal;
