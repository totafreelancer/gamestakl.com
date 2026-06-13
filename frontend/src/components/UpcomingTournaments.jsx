import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Clock, Users, DollarSign } from 'lucide-react'
import { tournamentService } from '../api/tournaments'

const UpcomingTournaments = () => {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingTournaments()
  }, [])

  const fetchUpcomingTournaments = async () => {
    try {
      const response = await tournamentService.getUpcomingTournaments()
      setTournaments(response.tournaments || [])
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

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
      FREEFIRE: '🔥',
      PUBG: '🪖',
    }
    return icons[gameName] || '🎮'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-dark-800 dark:border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Upcoming Tournaments
        </h3>
        <Link
          to="/tournaments"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <p className="text-gray-600 text-center py-4 dark:text-gray-400">No upcoming tournaments</p>
      ) : (
        <div className="space-y-3">
          {tournaments.slice(0, 3).map((tournament) => (
            <Link
              key={tournament.id}
              to="/tournaments"
              className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors dark:bg-dark-700 dark:hover:bg-dark-600"
            >
              <div className="flex items-start gap-3">
                {tournament.tournament_image ? (
                  <img
                    src={tournament.tournament_image}
                    alt={tournament.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="text-2xl">{getGameIcon(tournament.game_name)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate dark:text-white">
                    {tournament.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(tournament.start_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tournament.slots_left} left
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                    <DollarSign className="w-3 h-3" />
                    ${tournament.prize_pool}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default UpcomingTournaments
