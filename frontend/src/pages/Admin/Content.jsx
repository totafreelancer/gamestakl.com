import { useState, useEffect, useCallback } from 'react';
import { getPosts, approvePost, rejectPost, getComments, approveComment, deleteComment } from '../../api/admin';
import toast from 'react-hot-toast';

export default function Content() {
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await getPosts(params);
      setPosts(res.data.results);
      setTotalPages(res.data.total_pages);
      setTotal(res.data.count);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15 };
      if (statusFilter === 'approved') params.approved = 'true';
      if (statusFilter === 'pending') params.approved = 'false';
      const res = await getComments(params);
      setComments(res.data.results);
      setTotalPages(res.data.total_pages);
      setTotal(res.data.count);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (activeTab === 'posts') fetchPosts();
    else fetchComments();
  }, [activeTab, fetchPosts, fetchComments]);

  const handleApprovePost = async (postId) => {
    try {
      await approvePost(postId);
      toast.success('Post approved');
      fetchPosts();
    } catch {
      toast.error('Failed to approve post');
    }
  };

  const handleRejectPost = async (postId) => {
    try {
      await rejectPost(postId);
      toast.success('Post rejected');
      fetchPosts();
    } catch {
      toast.error('Failed to reject');
    }
  };

  const handleApproveComment = async (commentId) => {
    try {
      await approveComment(commentId);
      toast.success('Comment approved');
      fetchComments();
    } catch {
      toast.error('Failed to approve comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Do you want to delete this comment?')) return;
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted');
      fetchComments();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📝 Content Moderation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage posts and comments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-700">
        <button
          onClick={() => { setActiveTab('posts'); setPage(1); setStatusFilter(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          📝 Posts
        </button>
        <button
          onClick={() => { setActiveTab('comments'); setPage(1); setStatusFilter(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comments'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          💬 Comments
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All {activeTab === 'posts' ? 'Posts' : 'Comments'}</option>
          {activeTab === 'posts' ? (
            <>
              <option value="published">Published</option>
              <option value="pending">Pending</option>
            </>
          ) : (
            <>
              <option value="approved">Approved</option>
              <option value="pending">Unapproved</option>
            </>
          )}
        </select>
        <p className="text-sm text-gray-500 dark:text-gray-400 self-center">Total: {total}</p>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {posts.map((post) => (
              <div key={post.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        @{post.author_name}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {post.comments_count} comments
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {post.likes_count} likes
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      !post.is_flagged
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {!post.is_flagged ? 'Published' : 'Flagged'}
                    </span>
                    {!post.is_flagged ? (
                      <button
                        onClick={() => handleRejectPost(post.id)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                      >
                        Flag
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprovePost(post.id)}
                        className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Unflag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No posts found
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        @{comment.author_name}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Post: {comment.post_title}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      !comment.is_flagged
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {!comment.is_flagged ? 'Approved' : 'Flagged'}
                    </span>
                    {comment.is_flagged && (
                      <button
                        onClick={() => handleApproveComment(comment.id)}
                        className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Unflag
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No comments found
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-dark-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
