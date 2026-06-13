import { useState, useEffect } from 'react'
import { Crown, Trophy, Medal, TrendingUp, Users } from 'lucide-react'
import { authService } from '../api/auth'
import { toast } from 'react-hot-toast'

const Leaderboard = () => {
  const [gamers, setGamers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      // Fetch all users and their profiles
      const response = await authService.getProfile()
      // For demo, we'll create mock leaderboard data
      // In production, you'd have a dedicated endpoint
      const mockGamers = [
        { id: 1, username: 'ProGamer99', in_game_id: 'PRO_99', points: 15000, vip_status: true, total_posts: 234, total_comments: 567 },
        { id: 2, username: 'NightHawk', in_game_id: 'NH_2024', points: 12500, vip_status: true, total_posts: 189, total_comments: 423 },
        { id: 3, username: 'ShadowBlade', in_game_id: 'SB_X', points: 10000, vip_status: false, total_posts: 156, total_comments: 389 },
        { id: 4, username: 'CyberWolf', in_game_id: 'CW_777', points: 8500, vip_status: false, total_posts: 134, total_comments: 298 },
        { id: 5, username: 'PhoenixRise', in_game_id: 'PR_ELITE', points: 7200, vip_status: false, total_posts: 98, total_comments: 245 },
        { id: 6, username: 'StormBreaker', in_game_id: 'STORM_1', points: 6000, vip_status: false, total_posts: 87, total_comments: 198 },
        { id: 7, username: 'DragonSlayer', in_game_id: 'DS_420', points: 5000, vip_status: false, total_posts: 76, total_comments: 167 },
        { id: 8, username: 'VenomStrike', in_game_id: 'VS_PRO', points: 4200, vip_status: false, total_posts: 65, total_comments: 134 },
        { id: 9, username: 'BlazeMaster', in_game_id: 'BM_FIRE', points: 3500, vip_status: false, total_posts: 54, total_comments: 112 },
        { id: 10, username: 'IceQueen', in_game_id: 'IQ_FROST', points: 2800, vip_status: false, total_posts: 43, total_comments: 89 },
      ]
      setGamers(mockGamers)
    } catch (error) {
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>
  }

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30'
    return 'bg-dark-800 border-dark-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-0">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3 dark:text-white">
          <Trophy className="w-7 h-7 md:w-8 md:h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Top gamers ranked by points</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {gamers.slice(0, 3).map((gamer, index) => (
          <div
            key={gamer.id}
            className={`relative rounded-xl p-4 md:p-6 border ${getRankBg(index + 1)} ${
              index === 0 ? 'md:order-2 md:-mt-4' : index === 1 ? 'md:order-1' : 'md:order-3'
            }`}
          >
            {index === 0 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  #1 PLAYER
                </div>
              </div>
            )}
            <div className="text-center">
              <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center ${
                index === 0
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                  : index === 1
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                  : 'bg-gradient-to-br from-amber-600 to-amber-700'
              }`}>
                <span className="text-2xl md:text-3xl font-bold text-white">
                  {gamer.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 dark:text-white">{gamer.username}</h3>
              <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 dark:text-gray-400">{gamer.in_game_id}</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                {gamer.vip_status && (
                  <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-cyan-400">{gamer.points.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            All Rankings
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-dark-700/50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  Rank
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  Player
                </th>
                <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  In-Game ID
                </th>
                <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  Posts
                </th>
                <th className="hidden md:table-cell px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  Comments
                </th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-gray-400">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
              {gamers.map((gamer, index) => (
                <tr
                  key={gamer.id}
                  className={`hover:bg-gray-50 transition-colors dark:hover:bg-dark-700/50 ${
                    index < 3 ? getRankBg(index + 1) : ''
                  }`}
                >
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm md:text-base">
                          {gamer.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium text-sm md:text-base dark:text-white">{gamer.username}</span>
                          {gamer.vip_status && (
                            <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                              VIP
                            </span>
                          )}
                        </div>
                        <span className="sm:hidden text-xs text-gray-600 dark:text-gray-400">{gamer.in_game_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {gamer.in_game_id}
                  </td>
                  <td className="hidden md:table-cell px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {gamer.total_posts}
                  </td>
                  <td className="hidden md:table-cell px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {gamer.total_comments}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-right">
                    <span className="text-cyan-400 font-bold text-base md:text-lg">
                      {gamer.points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 text-center dark:bg-dark-800 dark:border-dark-700">
          <Users className="w-6 h-6 md:w-8 md:h-8 text-cyan-400 mx-auto mb-2" />
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{gamers.length}</p>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Players</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 text-center dark:bg-dark-800 dark:border-dark-700">
          <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {gamers.reduce((acc, g) => acc + g.points, 0).toLocaleString()}
          </p>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Points</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 text-center dark:bg-dark-800 dark:border-dark-700">
          <Crown className="w-6 h-6 md:w-8 md:h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {gamers.filter(g => g.vip_status).length}
          </p>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">VIP Members</p>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
