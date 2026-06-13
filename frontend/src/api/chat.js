import api, { rawAxios } from './axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const chatService = {
  // ==================== CONVERSATIONS ====================

  getConversations: async () => {
    try {
      const response = await api.get('/chat/conversations/')
      return response.data.results || response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch conversations' }
    }
  },

  getConversation: async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch conversation' }
    }
  },

  // ==================== DM ====================

  getOrCreateDM: async (userId) => {
    try {
      const response = await api.post(`/chat/conversations/dm/${userId}/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get or create conversation' }
    }
  },

  // ==================== GROUP CHAT ====================

  createGroup: async (name, participantIds) => {
    try {
      const response = await api.post('/chat/conversations/group/create/', {
        name,
        participant_ids: participantIds,
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create group' }
    }
  },

  addGroupMembers: async (conversationId, participantIds) => {
    try {
      const response = await api.post(
        `/chat/conversations/group/${conversationId}/add/`,
        { participant_ids: participantIds }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to add members' }
    }
  },

  removeGroupMember: async (conversationId, userId) => {
    try {
      const response = await api.post(
        `/chat/conversations/group/${conversationId}/remove/${userId}/`
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to remove member' }
    }
  },

  leaveGroup: async (conversationId) => {
    try {
      const response = await api.post(
        `/chat/conversations/group/${conversationId}/leave/`
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to leave group' }
    }
  },

  updateGroup: async (conversationId, name, avatarFile) => {
    try {
      const formData = new FormData()
      if (name) formData.append('name', name)
      if (avatarFile) formData.append('avatar', avatarFile)
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.patch(
        `${API_BASE_URL}/chat/conversations/group/${conversationId}/update/`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update group' }
    }
  },

  // ==================== MESSAGES ====================

  getMessages: async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages/`)
      return response.data.results || response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch messages' }
    }
  },

  /**
   * Upload an image file for a chat message.
   * POST /api/chat/messages/upload-image/
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<{image_url: string, message_id: number}>}
   */
  uploadMessageImage: async (imageFile) => {
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.post(
        `${API_BASE_URL}/chat/messages/upload-image/`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload image' }
    }
  },

  sendMessage: async (conversationId, text) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/send/`, { text })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send message' }
    }
  },

  sendMessageWithFile: async (conversationId, text, file) => {
    try {
      const formData = new FormData()
      formData.append('text', text || '')
      formData.append('file_attachment', file)
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.post(
        `${API_BASE_URL}/chat/conversations/${conversationId}/send/`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send message with file' }
    }
  },

  markSeen: async (conversationId) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/seen/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to mark messages as seen' }
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/chat/conversations/unread-count/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch unread count' }
    }
  },
}
