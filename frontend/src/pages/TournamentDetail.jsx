import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tournamentService } from '../api/tournaments'
import {
  Trophy,
  Clock,
  Users,
  DollarSign,
  Gamepad2,
  ArrowLeft,
  CheckCircle,
  Lock,
  AlertCircle,
  Calendar,
  MapPin,
  FileText,
  Loader2,
  Crown,
  Shield,
  Target,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import ShareModal from '../components/ShareModal'
import JoinTournamentModal from '../components/JoinTournamentModal'

const TournamentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [shareModal, setShareModal] = useState(null)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)

  useEffect(() => {
    fetchTournamentDetail()
    fetchParticipants()
  }, [id])

  const fetchTournamentDetail = async () => {
    try {
      setLoading(true)
      const response = await tournamentService.getTournament(id)
      setTournament(response)
    } catch (error) {
      toast.error('Failed to load tournament details')
      navigate('/tournaments')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const response = await tournamentService.getParticipants({ tournament: id })
      setParticipants(response.results || response)
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const handleJoinTournament = async () => {
    if (!user?.in_game_id) {
      toast.error('You do not have a Game ID in your profile. Please update your profile first.', {
        duration: 5000,
        id: 'no-game-id',
      })
      return
    }
    try {
      setJoining(true)
      const response = await tournamentService.joinTournament(id, 'mock', user.in_game_id)
      toast.success('Successfully joined the tournament!')
      if (response.payment_url) {
        window.open(response.payment_url, '_blank')
      }
      fetchTournamentDetail()
      fetchParticipants()
    } catch (error) {
      const errorMsg = error.error || error.message || error.detail || 'Failed to join tournament'
      if (errorMsg.includes('Game ID') || errorMsg.includes('game_id')) {
        toast.error('You do not have a Game ID in your profile. Please update your profile first.', { duration: 5000 })
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setJoining(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGameIcon = (gameName) => {
    const icons = { FREEFIRE: '🔥', PUBG: '🪖' }
    return icons[gameName] || '🎮'
  }

  const getStatusColor = (status) => {
    const colors = {
      UPCOMING: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      REGISTRATION_OPEN: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
      REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
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
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading tournament...</p>
        </div>
      </div>
    )
  }

  if (!tournament) return null

  const isJoinable =
    (tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') &&
    !tournament.is_full &&
    !tournament.has_joined

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'rules', label: 'Rules', icon: Shield },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/tournaments')}
        className="flex items-center gap-2 text-gray-600 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 mb-4 md:mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Tournament List</span>
      </button>

      {/* Hero Section */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        {/* Tournament Image Banner */}
        {tournament.tournament_image ? (
          <div className="w-full h-48 md:h-64 lg:h-72 overflow-hidden relative">
            <img
              src={tournament.tournament_image}
              alt={tournament.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{getGameIcon(tournament.game_name)}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                  {getStatusText(tournament.status)}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">{tournament.title}</h1>
              <p className="text-white/80 text-sm mt-1">{tournament.game_name}</p>
            </div>
          </div>
        ) : (
          /* No image — show header inline */
          <div className="bg-gradient-to-r from-cyan-600 to-purple-700 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{getGameIcon(tournament.game_name)}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                  {getStatusText(tournament.status)}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1">{tournament.title}</h1>
              <p className="text-white/70">{tournament.game_name}</p>
            </div>
          </div>
        )}

        {/* Prize Pool Highlight */}
        <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-b border-gray-200 dark:border-dark-700 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Prize Pool</p>
                <p className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">
                  ${parseFloat(tournament.prize_pool).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4" />
              <span>Entry Fee: <strong className="text-gray-900 dark:text-white">${parseFloat(tournament.entry_fee).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-dark-700 border-b border-gray-200 dark:border-dark-700">
          <div className="p-4 text-center">
            <Users className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {tournament.slots_filled || 0}/{tournament.slots_available}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Slots Filled</p>
          </div>
          <div className="p-4 text-center">
            <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {new Date(tournament.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
          </div>
          <div className="p-4 text-center">
            <Target className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{tournament.slots_left || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Slots Left</p>
          </div>
          <div className="p-4 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(tournament.registration_percentage || 0)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Registration</p>
          </div>
        </div>

        {/* Slots Progress Bar */}
        <div className="px-4 md:px-6 py-3 bg-gray-50 dark:bg-dark-900/50">
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-dark-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${tournament.registration_percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Join Action Area */}
        <div className="p-4 md:p-6">
          {/* Not logged in warning */}
          {!user && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 dark:bg-blue-500/10 dark:border-blue-500/20">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Please log in to join the tournament.{' '}
                <Link to="/login" className="underline font-medium">Login</Link>
              </p>
            </div>
          )}

          {/* No Game ID warning */}
          {user && !user?.in_game_id && isJoinable && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 dark:bg-yellow-500/10 dark:border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Game ID is required.{' '}
                <Link to="/profile" className="underline font-medium">Update Profile</Link>
              </p>
            </div>
          )}

          {/* Not logged in — show login prompt */}
          {!user && isJoinable && (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 text-base md:text-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 shadow-lg shadow-cyan-500/25"
            >
              <Trophy className="w-5 h-5" />
              Login to Join Tournament
            </button>
          )}

          {/* Join Button — opens payment modal instead of direct join */}
          {user && tournament.has_joined ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-green-50 border border-green-200 rounded-xl dark:bg-green-500/10 dark:border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium dark:text-green-400">You have already joined</span>
            </div>
          ) : tournament.is_full ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 border border-gray-200 rounded-xl dark:bg-dark-700 dark:border-dark-600">
              <Lock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 font-medium">Tournament Full</span>
            </div>
          ) : user && isJoinable ? (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 text-base md:text-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 shadow-lg shadow-cyan-500/25"
            >
              <Trophy className="w-5 h-5" />
              Join — ৳{parseFloat(tournament.entry_fee).toLocaleString()}
            </button>
          ) : tournament.status === 'COMPLETED' ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 border border-gray-200 rounded-xl dark:bg-dark-700 dark:border-dark-600">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 font-medium">Completed</span>
            </div>
          ) : tournament.status === 'CANCELLED' ? (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-500/10 dark:border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-500 font-medium">Cancelled</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 border border-gray-200 rounded-xl dark:bg-dark-700 dark:border-dark-600">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 font-medium">{getStatusText(tournament.status)}</span>
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={() => {
              if (!user) {
                toast.error('Please login to share tournaments', { id: 'login-share' })
                navigate('/login')
                return
              }
              setShareModal({
                url: `${window.location.origin}/tournament/${tournament.id}`,
                title: tournament.title,
                description: `🏆 ${tournament.game_name} Tournament — Prize Pool: $${parseFloat(tournament.prize_pool).toLocaleString()} — Entry Fee: $${parseFloat(tournament.entry_fee).toLocaleString()}`,
                type: 'tournament'
              })
            }}
            className="flex items-center justify-center gap-2 w-full py-3 mt-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors dark:bg-dark-700 dark:border-dark-600 dark:hover:bg-dark-600"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Share Tournament</span>
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <ShareModal
          url={shareModal.url}
          title={shareModal.title}
          description={shareModal.description}
          type={shareModal.type}
          onClose={() => setShareModal(null)}
        />
      )}

      {/* Tabs */}
      <div className="mt-6 bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-dark-800 dark:border-dark-700">
        <div className="flex border-b border-gray-200 dark:border-dark-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 md:py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-500 border-b-2 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/5'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {tournament.description || 'No description available.'}
                </p>
              </div>

              {/* Tournament Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Start Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(tournament.start_time)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Game</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tournament.game_name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">${parseFloat(tournament.entry_fee).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Prize Pool</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">${parseFloat(tournament.prize_pool).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {tournament.created_by && (
                  <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <Crown className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Organizer</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tournament.created_by}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 dark:bg-dark-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Slots</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tournament.slots_available}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-500" />
                Participants ({participants.length})
              </h3>
              {participants.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No one has joined yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p, index) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors dark:bg-dark-900/50 dark:hover:bg-dark-700"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {p.gamer?.username || p.gamer}
                        </p>
                        {p.in_game_id && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Game ID: {p.in_game_id}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.payment_status === 'PAID'
                          ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                          : p.payment_status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
                      }`}>
                        {p.payment_status === 'PAID' ? 'Paid' : p.payment_status === 'PENDING' ? 'Pending' : p.payment_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-500" />
                Rules
              </h3>
              {tournament.rules ? (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {tournament.rules}
                  </p>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No rules have been added.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Join Tournament Payment Modal ─────────────────────── */}
      <JoinTournamentModal
        tournament={tournament}
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={() => {
          // Refresh tournament data to reflect any changes
          fetchTournamentDetail();
          fetchParticipants();
        }}
      />
    </div>
  )
}

export default TournamentDetail
