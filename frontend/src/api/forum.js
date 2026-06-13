import apiClient, { rawAxios, API_BASE_URL } from './axiosConfig'

export const forumService = {
  // Posts
  getPosts: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key])
        }
      })
      
      const response = await apiClient.get('/forum/posts/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch posts' }
    }
  },

  getPost: async (postId) => {
    try {
      const response = await apiClient.get(`/forum/posts/${postId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch post' }
    }
  },

  createPost: async (postData) => {
    try {
      const response = await apiClient.post('/forum/posts/', postData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create post' }
    }
  },

  createPostWithImage: async (formData) => {
    try {
      // API_BASE_URL is imported from axiosConfig
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.post(`${API_BASE_URL}/forum/posts/`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          // Let browser set Content-Type with boundary automatically
        },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create post' }
    }
  },

  updatePost: async (postId, postData) => {
    try {
      const response = await apiClient.patch(`/forum/posts/${postId}/`, postData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update post' }
    }
  },

  deletePost: async (postId) => {
    try {
      const response = await apiClient.delete(`/forum/posts/${postId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete post' }
    }
  },

  upvotePost: async (postId, action) => {
    try {
      const response = await apiClient.post(`/forum/posts/${postId}/upvote/`, { action })
      return response.data
    } catch (error) {
      console.error('Upvote error:', error.response?.data || error)
      throw error.response?.data || { error: 'Failed to upvote post' }
    }
  },

  // Comments
  getComments: async (postId, filters = {}) => {
    try {
      const params = new URLSearchParams()
      params.append('post', postId)
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, filters[key])
        }
      })
      
      const response = await apiClient.get('/forum/comments/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch comments' }
    }
  },

  createComment: async (commentData) => {
    try {
      const response = await apiClient.post('/forum/comments/', commentData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create comment' }
    }
  },

  updateComment: async (commentId, commentData) => {
    try {
      const response = await apiClient.patch(`/forum/comments/${commentId}/`, commentData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update comment' }
    }
  },

  deleteComment: async (commentId) => {
    try {
      const response = await apiClient.delete(`/forum/comments/${commentId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete comment' }
    }
  },

  upvoteComment: async (commentId, action) => {
    try {
      const response = await apiClient.post(`/forum/comments/${commentId}/upvote/`, { action })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upvote comment' }
    }
  },

  // Stats
  getForumStats: async () => {
    try {
      const response = await apiClient.get('/forum/stats/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch forum stats' }
    }
  }
}