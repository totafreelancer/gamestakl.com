import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forumService } from '../api/forum'
import { socialService } from '../api/social'
import { tournamentService } from '../api/tournaments'
import {
  MessageSquare,
  Heart,
  Clock,
  Trophy,
  Plus,
  TrendingUp,
  Users,
  UserPlus,
  UserMinus,
  Send
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import CreatePostModal from '../components/CreatePostModal'
import UpcomingTournaments from '../components/UpcomingTournaments'
import UserAvatar from '../components/UserAvatar'
import Sidebar from '../components/Sidebar'
import ShareModal from '../components/ShareModal'

const Home = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shareModal, setShareModal] = useState(null)
  const [followingUsers, setFollowingUsers] = useState(() => {
    const saved = localStorage.getItem('followingUsers')
    return saved ? JSON.parse(saved) : []
  })

  const categories = [
    { id: 'all', name: 'All Posts' },
    { id: 'PC', name: 'PC Gaming' },
    { id: 'MOBILE', name: 'Mobile Gaming' },
    { id: 'NEWS', name: 'Gaming News' },
    { id: 'GENERAL', name: 'General' },
  ]

  useEffect(() => {
    fetchPosts()
  }, [selectedCategory])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const filters = selectedCategory !== 'all' ? { category: selectedCategory } : {}
      const response = await forumService.getPosts(filters)
      setPosts(response.results || response)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const [likedPosts, setLikedPosts] = useState(() => {
    const saved = localStorage.getItem('likedPosts')
    return saved ? JSON.parse(saved) : []
  })

  const handleLike = async (postId) => {
    if (!user) {
      toast.error('Please login to like posts', { id: 'login-like' })
      navigate('/login')
      return
    }
    try {
      const isLiked = likedPosts.includes(postId)
      if (isLiked) {
        await forumService.upvotePost(postId, 'remove_upvote')
        setLikedPosts(prev => {
          const updated = prev.filter(id => id !== postId)
          localStorage.setItem('likedPosts', JSON.stringify(updated))
          return updated
        })
      } else {
        await forumService.upvotePost(postId, 'upvote')
        setLikedPosts(prev => {
          const updated = [...prev, postId]
          localStorage.setItem('likedPosts', JSON.stringify(updated))
          return updated
        })
      }
      fetchPosts()
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleFollow = async (authorId, authorName) => {
    if (!user) {
      toast.error('Please login to follow users', { id: 'login-follow' })
      navigate('/login')
      return
    }
    if (!authorId) return
    if (authorId === user?.id) return
    try {
      const isFollowing = followingUsers.includes(authorId)
      if (isFollowing) {
        await socialService.unfollowUser(authorId)
        setFollowingUsers(prev => {
          const updated = prev.filter(id => id !== authorId)
          localStorage.setItem('followingUsers', JSON.stringify(updated))
          return updated
        })
        toast.success(`Unfollowed ${authorName}`)
      } else {
        await socialService.followUser(authorId)
        setFollowingUsers(prev => {
          const updated = [...prev, authorId]
          localStorage.setItem('followingUsers', JSON.stringify(updated))
          return updated
        })
        toast.success(`Following ${authorName}`)
      }
    } catch (error) {
      toast.error(error.error || 'Something went wrong')
    }
  }

  const handleMessage = (authorId, authorName) => {
    if (!user) {
      toast.error('Please login to message users', { id: 'login-message' })
      navigate('/login')
      return
    }
    if (!authorId) return
    navigate('/messages')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getCategoryColor = (category) => {
    const colors = {
      PC: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      MOBILE: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
      NEWS: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      GENERAL: 'bg-gray-200 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    }
    return colors[category] || colors.GENERAL
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Guest Login Banner */}
        {!user && (
          <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 dark:border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Join the Gaming Community!</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Login to like, comment, share and create posts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
              >
                Register
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-700 dark:hover:bg-dark-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600 dark:text-gray-400">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">HubZone Forum</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Connect with gamers worldwide</p>
            </div>
          </div>
          {user ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Post</span>
              <span className="sm:hidden">Post</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Login to Post</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id || 'all'}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-white dark:bg-dark-700 dark:text-gray-400 dark:hover:bg-dark-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg dark:bg-dark-800">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No posts yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all dark:bg-dark-800 dark:border-dark-700"
              >
                {/* Post Header - Author Info */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <Link to={post.author_id && post.author_id !== user?.id ? `/profile/${post.author_id}` : '/profile'}>
                    <UserAvatar 
                      user={{ 
                        username: post.author, 
                        profile_picture_url: post.author_profile_picture 
                      }} 
                      size="md"
                      className="hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={post.author_id && post.author_id !== user?.id ? `/profile/${post.author_id}` : '/profile'} className="font-semibold text-gray-900 hover:text-cyan-600 transition-colors dark:text-white dark:hover:text-cyan-400">
                        {post.author}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                        {post.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  {/* Follow & Message buttons for other users */}
                  {post.author_id && post.author_id !== user?.id && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleFollow(post.author_id, post.author)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          followingUsers.includes(post.author_id)
                            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400'
                            : 'bg-cyan-500 text-white hover:bg-cyan-600'
                        }`}
                      >
                        {followingUsers.includes(post.author_id) ? (
                          <><UserMinus className="w-3 h-3" /> Following</>
                        ) : (
                          <><UserPlus className="w-3 h-3" /> Follow</>
                        )}
                      </button>
                      <button
                        onClick={() => handleMessage(post.author_id, post.author)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
                      >
                        <Send className="w-3 h-3" /> Message
                      </button>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3">
                  {post.content && (
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 dark:text-gray-300">
                      {post.content}
                    </p>
                  )}
                  {post.image_url && (
                    <Link to={`/post/${post.id}`} className="block mt-3">
                      <img 
                        src={post.image_url} 
                        alt="Post attachment" 
                        className="w-full object-cover rounded-lg border border-gray-200 dark:border-dark-600 hover:opacity-90 transition-opacity"
                      />
                    </Link>
                  )}
                </div>

                {/* Post Footer - Stats & Actions */}
                <div className="border-t border-gray-100 dark:border-dark-700">
                  {/* Stats Row */}
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{post.upvote_count || 0} likes</span>
                    <span>{post.comment_count || 0} comments</span>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center border-t border-gray-100 dark:border-dark-700">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-colors ${
                        likedPosts.includes(post.id)
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-dark-700'
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition-transform ${
                        likedPosts.includes(post.id) ? 'fill-red-500 scale-110' : 'scale-100'
                      }`} />
                      <span className="text-sm font-medium">
                        {likedPosts.includes(post.id) ? 'Liked' : 'Like'}
                      </span>
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-dark-700"></div>
                    <Link
                      to={`/post/${post.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors dark:text-gray-400 dark:hover:bg-dark-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">Comment</span>
                    </Link>
                    <div className="w-px h-6 bg-gray-200 dark:bg-dark-700"></div>
                    <button
                      onClick={() => {
                        if (!user) {
                          toast.error('Please login to share posts', { id: 'login-share' })
                          navigate('/login')
                          return
                        }
                        setShareModal({
                          url: `${window.location.origin}/post/${post.id}`,
                          title: post.content?.substring(0, 60) || 'Gaming Post',
                          description: post.content || '',
                          type: 'post'
                        })
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors dark:text-gray-400 dark:hover:bg-dark-700"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-sm font-medium">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Right Sidebar - Hidden on mobile, shown on md+ */}
      <div className="hidden md:block w-80 space-y-6">
        {/* User Stats Card or Login Prompt */}
        {user ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.username}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-400">{user?.points || 0} points</span>
                  {user?.vip_status && (
                    <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                      VIP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-100 rounded-lg p-3 dark:bg-dark-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.total_posts || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Posts</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 dark:bg-dark-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.total_comments || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Comments</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-5 text-center dark:border-cyan-500/30">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Join the Community</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Login to interact with posts, join tournaments, and connect with gamers!</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity mb-2"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Upcoming Tournaments */}
        <UpcomingTournaments />

        {/* Trending Topics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-dark-800 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 dark:text-white">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Trending Topics
          </h3>
          <div className="space-y-3">
            {['#CSGO2', '#ValorantChampions', '#PUBGUpdate', '#GamingNews'].map((tag) => (
              <div key={tag} className="flex items-center justify-between">
                <span className="text-cyan-400 hover:text-cyan-300 cursor-pointer">{tag}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {Math.floor(Math.random() * 500) + 100}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile User Stats - Shown only on mobile */}
      <div className="md:hidden bg-white border border-gray-200 rounded-lg p-4 dark:bg-dark-800 dark:border-dark-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">{user?.username}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-cyan-400">{user?.points || 0} points</span>
              {user?.vip_status && (
                <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                  VIP
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-100 rounded-lg p-2 dark:bg-dark-700">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{user?.total_posts || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Posts</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-2 dark:bg-dark-700">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{user?.total_comments || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Comments</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-2 dark:bg-dark-700">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{user?.tournaments_won || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Wins</p>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchPosts()
          }}
        />
      )}
    </div>
  )
}

export default Home
