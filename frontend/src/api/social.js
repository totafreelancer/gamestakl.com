import apiClient, { rawAxios, API_BASE_URL } from './axiosConfig'

export const socialService = {
  // Follow / Unfollow
  followUser: async (userId) => {
    try {
      const response = await apiClient.post(`/auth/users/${userId}/follow/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to follow user' }
    }
  },

  unfollowUser: async (userId) => {
    try {
      const response = await apiClient.post(`/auth/users/${userId}/unfollow/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to unfollow user' }
    }
  },

  getFollowers: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/users/${userId}/followers/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch followers' }
    }
  },

  getFollowing: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/users/${userId}/following/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch following' }
    }
  },

  checkFollowStatus: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/users/${userId}/follow-status/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to check follow status' }
    }
  },

  // User Search (for messaging)
  searchUsers: async (query) => {
    try {
      const response = await apiClient.get(`/auth/users/search/?q=${encodeURIComponent(query)}`)
      return response.data.results || []
    } catch (error) {
      throw error.response?.data || { error: 'Failed to search users' }
    }
  },

  // Personal Messaging
  sendMessage: async (receiverId, content) => {
    try {
      const formData = new FormData()
      formData.append('receiver_id', receiverId)
      formData.append('content', content)
      const response = await apiClient.post('/auth/messages/send/', formData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send message' }
    }
  },

  sendMessageWithImage: async (receiverId, content, imageFile) => {
    try {
      const formData = new FormData()
      formData.append('receiver_id', receiverId)
      formData.append('content', content)
      formData.append('image', imageFile)
      // API_BASE_URL is imported from axiosConfig
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.post(`${API_BASE_URL}/auth/messages/send/`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send message' }
    }
  },

  getConversation: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/messages/conversation/${userId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch conversation' }
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const response = await apiClient.delete(`/auth/messages/${messageId}/delete/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete message' }
    }
  },

  getInbox: async () => {
    try {
      const response = await apiClient.get('/auth/messages/inbox/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch inbox' }
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/auth/messages/unread-count/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch unread count' }
    }
  },
}
