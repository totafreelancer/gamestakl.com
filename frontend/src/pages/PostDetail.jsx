import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forumService } from '../api/forum'
import { 
  Heart, 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  Send,
  Reply,
  Trash2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import UserAvatar from '../components/UserAvatar'
import ShareModal from '../components/ShareModal'

const PostDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [shareModal, setShareModal] = useState(null)

  useEffect(() => {
    fetchPost()
    fetchComments()
  }, [id])

  const fetchPost = async () => {
    try {
      const response = await forumService.getPost(id)
      setPost(response)
    } catch (error) {
      toast.error('Failed to load post')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await forumService.getComments(id)
      setComments(response.results || response)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const [isLiked, setIsLiked] = useState(false)

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like posts', { id: 'login-like' })
      navigate('/login')
      return
    }
    try {
      if (isLiked) {
        await forumService.upvotePost(id, 'remove_upvote')
        setIsLiked(false)
      } else {
        await forumService.upvotePost(id, 'upvote')
        setIsLiked(true)
      }
      fetchPost()
    } catch (error) {
      toast.error('Failed to like post')
    }
  }

  const [likedComments, setLikedComments] = useState([])

  const handleCommentLike = async (commentId) => {
    if (!user) {
      toast.error('Please login to like comments', { id: 'login-like' })
      navigate('/login')
      return
    }
    try {
      if (likedComments.includes(commentId)) {
        await forumService.upvoteComment(commentId, 'remove_upvote')
        setLikedComments(prev => prev.filter(id => id !== commentId))
      } else {
        await forumService.upvoteComment(commentId, 'upvote')
        setLikedComments(prev => [...prev, commentId])
      }
      fetchComments()
    } catch (error) {
      toast.error('Failed to like comment')
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please login to comment', { id: 'login-comment' })
      navigate('/login')
      return
    }
    if (!commentText.trim()) return

    try {
      setSubmitting(true)
      await forumService.createComment({
        post: id,
        content: commentText,
        parent_comment: replyingTo
      })
      toast.success('Comment added!')
      setCommentText('')
      setReplyingTo(null)
      fetchComments()
      fetchPost()
    } catch (error) {
      toast.error(error.error || 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await forumService.deleteComment(commentId)
      toast.success('Comment deleted')
      fetchComments()
      fetchPost()
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderComment = (comment, level = 0) => {
    const replies = comments.filter(c => c.parent_comment === comment.id)
    
    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-4 md:ml-8 border-l-2 border-gray-200 pl-3 md:pl-4 dark:border-dark-700' : ''}`}>
        <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-2 md:mb-3 dark:bg-dark-700/50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserAvatar 
                user={{ 
                  username: comment.author, 
                  profile_picture_url: comment.author_profile_picture 
                }} 
                size="sm"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.author}</span>
                <span className="text-xs text-gray-500 ml-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(comment.created_at)}
                </span>
              </div>
            </div>
            {user?.username === comment.author && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-gray-700 mb-2 md:mb-3 text-sm md:text-base dark:text-gray-300">{comment.content}</p>
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => handleCommentLike(comment.id)}
              className={`flex items-center gap-1 transition-colors ${
                likedComments.includes(comment.id)
                  ? 'text-red-500'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${
                likedComments.includes(comment.id) ? 'fill-red-500' : ''
              }`} />
              <span className="text-xs md:text-sm">{comment.upvote_count || 0}</span>
            </button>
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span className="text-xs md:text-sm">Reply</span>
            </button>
          </div>
        </div>
        {replies.map(reply => renderComment(reply, level + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!post) return null

  const topLevelComments = comments.filter(c => !c.parent_comment)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6 transition-colors dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Forum</span>
      </button>

      {/* Post */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 mb-4 md:mb-6 dark:bg-dark-800 dark:border-dark-700">
        <div className="flex gap-3 md:gap-4">
          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleLike}
              className={`p-1.5 md:p-2 rounded-lg transition-all ${
                isLiked
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-dark-700'
              }`}
            >
              <Heart className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${
                isLiked ? 'fill-red-500 scale-110' : 'scale-100'
              }`} />
            </button>
            <span className={`text-lg md:text-xl font-bold ${
              isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            }`}>{post.upvote_count || 0}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
              <Link to={post.author_id ? `/profile/${post.author_id}` : '/profile'}>
                <UserAvatar 
                  user={{ 
                    username: post.author, 
                    profile_picture_url: post.author_profile_picture 
                  }} 
                  size="sm"
                  className="hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="px-2 py-1 bg-cyan-100 text-cyan-600 rounded text-xs font-medium dark:bg-cyan-500/20 dark:text-cyan-400">
                {post.category}
              </span>
              <Link to={post.author_id ? `/profile/${post.author_id}` : '/profile'} className="text-xs md:text-sm text-cyan-400 font-medium hover:underline">
                {post.author}
              </Link>
              <span className="text-xs md:text-sm text-gray-500">{formatDate(post.created_at)}</span>
            </div>
            {post.content && (
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap text-sm md:text-base dark:text-gray-300">{post.content}</p>
              </div>
            )}
            {post.image_url && (
              <div className="mt-4">
                <img 
                  src={post.image_url} 
                  alt="Post attachment" 
                  className="max-w-full max-h-96 object-cover rounded-lg border border-gray-200 dark:border-dark-600"
                />
              </div>
            )}
            <div className="flex items-center gap-3 mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 dark:border-dark-700">
              <span className="flex items-center gap-2 text-gray-600 text-sm dark:text-gray-400">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                {post.comment_count || 0} comments
              </span>
              <button
                onClick={() => {
                  if (!user) {
                    toast.error('Please login to share', { id: 'login-share' })
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
              >
                <Send className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
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

      {/* Comment Form or Login Prompt */}
      {user ? (
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6 dark:bg-dark-800 dark:border-dark-700">
          <form onSubmit={handleSubmitComment}>
            {replyingTo && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Replying to comment</span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs md:text-sm font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 md:px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none text-sm md:text-base dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Posting...' : 'Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-4 mb-4 md:mb-6 text-center dark:border-cyan-500/30">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Login to join the conversation!</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Login to Comment
          </button>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 dark:text-white">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h3>
        {topLevelComments.length === 0 ? (
          <div className="text-center py-6 md:py-8 bg-white border border-gray-200 rounded-lg dark:bg-dark-800">
            <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-3 md:mb-4" />
            <p className="text-gray-600 text-sm md:text-base dark:text-gray-400">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {topLevelComments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PostDetail
