import { useState } from 'react'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { socialService } from '../api/social'
import { toast } from 'react-hot-toast'

const FollowButton = ({ userId, initialIsFollowing = false, followerCount: initialCount = 0, onFollowChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const handleToggleFollow = async () => {
    try {
      setLoading(true)
      if (isFollowing) {
        const result = await socialService.unfollowUser(userId)
        setIsFollowing(false)
        setFollowerCount(result.follower_count)
        toast.success(result.message)
      } else {
        const result = await socialService.followUser(userId)
        setIsFollowing(true)
        setFollowerCount(result.follower_count)
        toast.success(result.message)
      }
      if (onFollowChange) onFollowChange(isFollowing ? false : true)
    } catch (error) {
      toast.error(error.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400'
          : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-90'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  )
}

export default FollowButton
