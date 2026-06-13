import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forumService } from '../api/forum'
import { authService } from '../api/auth'
import { socialService } from '../api/social'
import FollowButton from '../components/FollowButton'
import { 
  User, 
  Mail, 
  Gamepad2, 
  Trophy, 
  MessageSquare, 
  Trash2, 
  Edit3,
  Crown,
  Calendar,
  AlertTriangle,
  Send,
  Users,
  UserPlus,
  UserMinus,
  X,
  Loader2,
  Coins,
  Camera,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [userPosts, setUserPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [profileUser, setProfileUser] = useState(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [formData, setFormData] = useState({
    in_game_id: '',
    first_name: '',
    last_name: ''
  })
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef(null)

  // Followers/Following Modal States
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  const isOwnProfile = !id || parseInt(id) === user?.id
  const profileUserId = isOwnProfile ? user?.id : parseInt(id)
  // Choose the appropriate user object for display: own profile uses the merged profileUser,
  // others use the nested user object within profileUser.
  const displayedUser = isOwnProfile ? profileUser : profileUser?.user

  useEffect(() => {
    loadProfile()
  }, [id, user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      if (isOwnProfile) {
        // Fetch the latest profile data to ensure points and other fields are up‑to‑date,
        // especially after an admin modifies the user's points.
        const profileData = await authService.getProfile()
        const userData = profileData.user || profileData
        // Merge profile-specific fields.
        const merged = {
          ...userData,
          points: profileData.points,
          vip_status: profileData.vip_status,
          in_game_id: profileData.in_game_id,
          profile_picture: profileData.profile_picture,
          profile_picture_url: profileData.profile_picture_url,
        }
        setProfileUser(merged)
        setFollowersCount(profileData.followers_count || 0)
        setFollowingCount(profileData.following_count || 0)
        setFormData({
          in_game_id: merged.in_game_id || '',
          first_name: merged.first_name || '',
          last_name: merged.last_name || ''
        })
        const response = await forumService.getPosts({ author: merged.id })
        setUserPosts(response.results || response)
      } else {
        const profileData = await authService.getUserProfile(parseInt(id))
        const userData = profileData.user || profileData
        const profile = profileData.profile || profileData
        const profilePictureUrl = profileData.profile_picture_url || profile?.profile_picture_url
        setProfileUser({ user: userData, ...profile, profile_picture_url: profilePictureUrl })
        setFollowersCount(profileData.followers_count || 0)
        setFollowingCount(profileData.following_count || 0)
        const response = await forumService.getPosts({ author: parseInt(id) })
        setUserPosts(response.results || response)
        const followStatus = await socialService.checkFollowStatus(parseInt(id))
        setIsFollowing(followStatus.is_following)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load followers list
  const loadFollowers = async () => {
    try {
      setModalLoading(true)
      const data = await socialService.getFollowers(profileUserId)
      setFollowersList(data.followers || data)
      setShowFollowersModal(true)
    } catch (error) {
      toast.error('Failed to load followers')
    } finally {
      setModalLoading(false)
    }
  }

  // Load following list
  const loadFollowing = async () => {
    try {
      setModalLoading(true)
      const data = await socialService.getFollowing(profileUserId)
      setFollowingList(data.following || data)
      setShowFollowingModal(true)
    } catch (error) {
      toast.error('Failed to load following list')
    } finally {
      setModalLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      await updateProfile(formData)
      setEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleProfilePictureClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click()
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    try {
      setUploadingPicture(true)
      const profileData = await authService.uploadProfilePicture(file)
      // Update local profile state with new picture
      setProfileUser(prev => ({
        ...prev,
        profile_picture: profileData.profile_picture,
        profile_picture_url: profileData.profile_picture_url,
      }))
      toast.success('Profile picture updated!')
    } catch (error) {
      toast.error(error.error || 'Failed to upload profile picture')
    } finally {
      setUploadingPicture(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteClick = (post) => {
    setPostToDelete(post)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!postToDelete) return
    
    try {
      await forumService.deletePost(postToDelete.id)
      toast.success('Post deleted successfully!')
      setShowDeleteModal(false)
      setPostToDelete(null)
      fetchUserPosts()
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category) => {
    const colors = {
      PC: 'bg-blue-500/20 text-blue-400',
      MOBILE: 'bg-green-500/20 text-green-400',
      NEWS: 'bg-purple-500/20 text-purple-400',
      GENERAL: 'bg-gray-500/20 text-gray-400',
    }
    return colors[category] || colors.GENERAL
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6 dark:bg-dark-800 dark:border-dark-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
        <>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-dark-600 ${isOwnProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={handleProfilePictureClick}
            >
              {profileUser?.profile_picture_url ? (
                <img 
                  src={profileUser.profile_picture_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    {isOwnProfile ? (profileUser?.username?.charAt(0).toUpperCase() || 'U') : (profileUser?.user?.username?.charAt(0).toUpperCase() || 'U')}
                  </span>
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  {uploadingPicture ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                {isOwnProfile ? profileUser?.username : profileUser?.user?.username}
                {(isOwnProfile ? profileUser?.vip_status : profileUser?.vip_status) && (
                  <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    VIP
                  </span>
                )}
              </h1>
              <p className="text-gray-600 flex items-center gap-2 dark:text-gray-400">
                <Gamepad2 className="w-4 h-4" />
                {isOwnProfile ? (profileUser?.in_game_id || 'No Game ID') : (profileUser?.in_game_id || 'No Game ID')}
              </p>
              {/* Points display */}
              <p className="text-gray-600 flex items-center gap-2 dark:text-gray-400 mt-1">
                <Coins className="w-4 h-4" />
                {isOwnProfile ? (profileUser?.points ?? 0) : (profileUser?.points ?? 0)} Points
              </p>
              <p className="text-gray-500 flex items-center gap-2 mt-1 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                Joined {formatDate(isOwnProfile ? profileUser?.date_joined : profileUser?.user?.date_joined)}
              </p>
            </div>
          </div>
          {isOwnProfile ? (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors dark:bg-dark-700 dark:hover:bg-dark-600 dark:text-white"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sm:hidden">Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    if (isFollowing) {
                      await socialService.unfollowUser(parseInt(id))
                      setIsFollowing(false)
                      setFollowersCount(prev => prev - 1)
                      toast.success('Unfollowed')
                    } else {
                      await socialService.followUser(parseInt(id))
                      setIsFollowing(true)
                      setFollowersCount(prev => prev + 1)
                      toast.success('Following')
                    }
                  } catch (error) {
                    toast.error(error.error || 'Something went wrong')
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-90'
                }`}
              >
                {isFollowing ? (
                  <><UserMinus className="w-4 h-4" /> Following</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Follow</>
                )}
              </button>
              <button
                onClick={() => navigate(`/messages?user=${id}`)}
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors dark:bg-dark-700 dark:hover:bg-dark-600 dark:text-white"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Message</span>
              </button>
            </div>
          )}
        </div>

        {/* Followers / Following Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
          <button
            onClick={loadFollowers}
            disabled={modalLoading}
            className="text-center group hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <p className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors">{followersCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-cyan-400">Followers</p>
          </button>
          <button
            onClick={loadFollowing}
            disabled={modalLoading}
            className="text-center group hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <p className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors">{followingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-cyan-400">Following</p>
          </button>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{userPosts.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Posts</p>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6 dark:bg-dark-800 dark:border-dark-700">
          <h2 className="text-xl font-bold text-gray-900 mb-4 dark:text-white">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                <Gamepad2 className="w-4 h-4 inline mr-2" />
                In-Game ID
              </label>
              <input
                type="text"
                value={formData.in_game_id}
                onChange={(e) => setFormData({ ...formData, in_game_id: e.target.value })}
                placeholder="Enter your in-game ID"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last name"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User's Posts */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 dark:bg-dark-800 dark:border-dark-700">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 dark:text-white">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          My Posts ({userPosts.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">You haven't created any posts yet.</p>
            <Link
              to="/"
              className="inline-block mt-4 text-cyan-400 hover:text-cyan-300"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors dark:bg-dark-700 dark:border-dark-600 dark:hover:border-dark-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(post.category)}`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(post.created_at)}
                      </span>
                      {post.is_flagged && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          Flagged
                        </span>
                      )}
                    </div>
                    <Link to={`/post/${post.id}`}>
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 hover:text-cyan-600 transition-colors dark:text-white dark:hover:text-cyan-400">
                        {post.title}
                      </h3>
                    </Link>
                    {post.image_url && (
                      <Link to={`/post/${post.id}`} className="block mt-2">
                        <img 
                          src={post.image_url} 
                          alt="Post attachment" 
                          className="w-full object-cover rounded-lg border border-gray-200 dark:border-dark-600 hover:opacity-90 transition-opacity"
                        />
                      </Link>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {post.upvote_count || 0} upvotes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.comment_count || 0} comments
                      </span>
                    </div>
                  </div>
                  {post.author === displayedUser?.username && (
                    <button
                      onClick={() => handleDeleteClick(post)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 dark:text-red-400 dark:hover:bg-red-500/20"
                      title="Delete post"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                Delete Post
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-2 dark:text-gray-300">
              Are you sure you want to delete this post?
            </p>
            <p className="text-gray-600 text-sm mb-6 dark:text-gray-400">
              "{postToDelete?.title}"
            </p>
            <p className="text-red-400 text-sm mb-6">
              This action cannot be undone. All comments on this post will also be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg transition-colors"
              >
                Delete Post
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors dark:bg-dark-700 dark:hover:bg-dark-600 dark:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                <Users className="w-6 h-6 text-cyan-400" />
                Followers ({followersCount})
              </h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : followersList.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No followers yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followersList.map((follower, index) => (
                    <div
                      key={follower.id || follower.user?.id || index}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {(follower.follower?.username || follower.username || follower.user?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${follower.follower?.id || follower.user?.id || follower.id}`}
                          onClick={() => setShowFollowersModal(false)}
                          className="font-medium text-gray-900 hover:text-cyan-500 dark:text-white dark:hover:text-cyan-400 truncate block"
                        >
                          {follower.follower?.username || follower.username || follower.user?.username || 'Unknown'}
                        </Link>
                        {(follower.follower?.in_game_id || follower.in_game_id || follower.user?.in_game_id) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            🎮 {follower.follower?.in_game_id || follower.in_game_id || follower.user?.in_game_id}
                          </p>
                        )}
                      </div>
                      {follower.created_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {new Date(follower.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col dark:bg-dark-800 dark:border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                <UserPlus className="w-6 h-6 text-purple-400" />
                Following ({followingCount})
              </h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : followingList.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Not following anyone yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followingList.map((followed, index) => (
                    <div
                      key={followed.id || followed.user?.id || index}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {(followed.following?.username || followed.username || followed.user?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${followed.following?.id || followed.user?.id || followed.id}`}
                          onClick={() => setShowFollowingModal(false)}
                          className="font-medium text-gray-900 hover:text-purple-500 dark:text-white dark:hover:text-purple-400 truncate block"
                        >
                          {followed.following?.username || followed.username || followed.user?.username || 'Unknown'}
                        </Link>
                        {(followed.following?.in_game_id || followed.in_game_id || followed.user?.in_game_id) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            🎮 {followed.following?.in_game_id || followed.in_game_id || followed.user?.in_game_id}
                          </p>
                        )}
                      </div>
                      {followed.created_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {new Date(followed.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile