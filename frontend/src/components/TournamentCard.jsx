import { Link } from 'react-router-dom'
import { Clock, Users, DollarSign, Trophy, Lock, CheckCircle, AlertCircle, Swords } from 'lucide-react'

const TournamentCard = ({ tournament, onJoin, userHasGameId = true }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGameIcon = (gameName) => {
    const icons = {
      FREE_FIRE: '🔥',
      FREEFIRE: '🔥',
      PUBG: '🪖',
    }
    return icons[gameName] || '🎮'
  }

  const getMatchTypeLabel = (type) => {
    const labels = { SOLO: 'Solo', DUO: 'Duo', SQUAD: 'Squad' };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      UPCOMING: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      REGISTRATION_OPEN: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
      REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
      ONGOING: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      IN_PROGRESS: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      COMPLETED: 'bg-gray-200 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
      CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    }
    return colors[status] || colors.UPCOMING
  }

  const getStatusText = (status) => {
    const texts = {
      UPCOMING: 'Upcoming',
      REGISTRATION_OPEN: 'Registration Open',
      REGISTRATION_CLOSED: 'Registration Closed',
      ONGOING: 'Ongoing',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }
    return texts[status] || status
  }

  // Compute slots from new or legacy fields
  const totalSlots = tournament.total_slots || tournament.slots_available || 0;
  const filledSlots = tournament.joined_slots || tournament.slots_filled || tournament.participants_count || 0;
  const slotsLeft = totalSlots - filledSlots;

  // A tournament can be joined if it is not closed/completed, has available slots, the user hasn't joined yet,
  // and the status is either UPCOMING (allow immediate join after creation) or REGISTRATION_OPEN.
  const isJoinable =
    (tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') &&
    !tournament.is_full &&
    !tournament.has_joined

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block">
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all group dark:bg-dark-800 dark:border-dark-700">
      {/* Tournament Image */}
      {tournament.tournament_image && (
        <div className="w-full h-40 md:h-48 overflow-hidden">
          <img
            src={tournament.tournament_image}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      {/* Header with Game Icon */}
      <div className="bg-gradient-to-r from-gray-100 to-white p-4 border-b border-gray-200 dark:from-dark-700 dark:to-dark-800 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl md:text-4xl">{getGameIcon(tournament.game_name)}</div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900 group-hover:text-cyan-400 transition-colors dark:text-white">
                {tournament.title}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {tournament.game_name === 'FREE_FIRE' ? 'Free Fire' : tournament.game_name}
                </p>
                {tournament.match_type && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400">
                    <Swords className="w-2.5 h-2.5" />
                    {getMatchTypeLabel(tournament.match_type)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
            {getStatusText(tournament.status)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        {/* Prize Pool Highlight */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3 mb-3 md:mb-4 dark:bg-gradient-to-r dark:from-green-500/10 dark:to-cyan-500/10 dark:border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Prize Pool</span>
            <span className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">${parseFloat(tournament.prize_pool).toLocaleString()}</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">{formatDate(tournament.start_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">Entry: ${parseFloat(tournament.entry_fee).toLocaleString()}</span>
          </div>
        </div>

        {/* Slots Progress */}
        <div className="mb-3 md:mb-4">
          <div className="flex items-center justify-between text-xs md:text-sm mb-1 md:mb-2">
            <span className="text-gray-600 flex items-center gap-1 dark:text-gray-400">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              Slots
            </span>
            <span className="text-gray-900 font-medium dark:text-white">
              {filledSlots} / {totalSlots}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-dark-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${tournament.registration_percentage || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {slotsLeft} slots remaining
          </p>
        </div>

        {/* Join Button */}
        {!userHasGameId && isJoinable && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 dark:bg-yellow-500/10 dark:border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">Game ID required. Please update your profile.</p>
          </div>
        )}
        <button
          onClick={onJoin}
          disabled={!isJoinable || !userHasGameId}
          className={`w-full py-2 md:py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
            isJoinable && userHasGameId
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-dark-700 dark:text-gray-500'
          }`}
        >
          {tournament.has_joined ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Already Joined</span>
              <span className="sm:hidden">Joined</span>
            </>
          ) : tournament.is_full ? (
            <>
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Tournament Full</span>
              <span className="sm:hidden">Full</span>
            </>
          ) : isJoinable ? (
            <>
              <Trophy className="w-4 h-4" />
              Join & Pay
            </>
          ) : tournament.status === 'COMPLETED' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Completed
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              {getStatusText(tournament.status)}
            </>
          )}
        </button>
      </div>
    </div>
    </Link>
  )
}

export default TournamentCard
