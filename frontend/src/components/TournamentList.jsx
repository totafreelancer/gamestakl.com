import { useState, useEffect } from 'react';
import { Trophy, Clock, Users, DollarSign, Gamepad2, Search, Flame, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { tournamentService } from '../api/tournaments';
import TournamentCard from './TournamentCard';
import JoinTournamentModal from './JoinTournamentModal';

/**
 * TournamentList – Main tournament listing page component.
 *
 * Features:
 *  - Game filter tabs (All Games / Free Fire / PUBG)
 *  - Status filter dropdown
 *  - Search bar
 *  - Responsive card grid
 *  - "Join Now" triggers JoinTournamentModal
 */
const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // ── Game Tabs Configuration ────────────────────────────────────
  const gameTabs = [
    { id: 'ALL', label: 'All Games', icon: Gamepad2 },
    { id: 'FREE_FIRE', label: 'Free Fire', icon: Flame },
    { id: 'PUBG', label: 'PUBG', icon: Shield },
  ];

  const statuses = [
    { id: '', name: 'All Status' },
    { id: 'UPCOMING', name: 'Upcoming' },
    { id: 'REGISTRATION_OPEN', name: 'Registration Open' },
    { id: 'ONGOING', name: 'Ongoing' },
    { id: 'COMPLETED', name: 'Completed' },
  ];

  // ── Fetch Tournaments ──────────────────────────────────────────
  useEffect(() => {
    fetchTournaments();
  }, [selectedGame, selectedStatus]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedGame !== 'ALL') filters.game_name = selectedGame;
      if (selectedStatus) filters.status = selectedStatus;
      if (searchQuery) filters.search = searchQuery;

      const response = await tournamentService.getTournaments(filters);
      setTournaments(response.results || response);
    } catch (error) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  // ── Join Handler ───────────────────────────────────────────────
  const handleJoinClick = (tournament) => {
    setSelectedTournament(tournament);
    setIsModalOpen(true);
  };

  const handleJoinSuccess = () => {
    setIsModalOpen(false);
    setSelectedTournament(null);
    fetchTournaments(); // Refresh list to update slot counts
  };

  // ── Stats ──────────────────────────────────────────────────────
  const totalPlayers = tournaments.reduce(
    (acc, t) => acc + (t.joined_slots || t.slots_filled || 0), 0
  );
  const totalPrize = tournaments.reduce(
    (acc, t) => acc + parseFloat(t.prize_pool || 0), 0
  );
  const openCount = tournaments.filter(
    (t) => t.status === 'REGISTRATION_OPEN' || t.status === 'UPCOMING'
  ).length;

  return (
    <div className="px-4 md:px-0">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 dark:text-white">
          🏆 Tournament Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compete in Free Fire & PUBG tournaments and win prizes
        </p>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {tournaments.length}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Total Tournaments
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {totalPlayers}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Total Players
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                ${totalPrize.toLocaleString()}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Total Prize Pool
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 dark:bg-dark-800 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {openCount}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Open for Registration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Game Filter Tabs ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {gameTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedGame === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedGame(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-500/50 hover:text-cyan-500 dark:bg-dark-800 dark:border-dark-700 dark:text-gray-400 dark:hover:border-cyan-500/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Search & Status Filter ──────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 dark:bg-dark-800 dark:border-dark-700">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTournaments()}
                placeholder="Search tournaments..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchTournaments}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      </div>

      {/* ── Tournament Grid ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 dark:bg-dark-800 dark:border-dark-700">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg dark:text-gray-400">No tournaments found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onJoin={() => handleJoinClick(tournament)}
            />
          ))}
        </div>
      )}

      {/* ── Join Tournament Modal ───────────────────────────────── */}
      {isModalOpen && selectedTournament && (
        <JoinTournamentModal
          tournament={selectedTournament}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTournament(null);
          }}
          onSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
};

export default TournamentList;
