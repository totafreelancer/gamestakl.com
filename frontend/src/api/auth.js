import apiClient, { rawAxios, API_BASE_URL } from './axiosConfig'

export const authService = {
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login/', credentials)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Login failed' }
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register/', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Registration failed' }
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await apiClient.post('/auth/logout/', { refresh: refreshToken })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  },

  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/profile/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get profile' }
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.patch('/auth/profile/', profileData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update profile' }
    }
  },

  uploadProfilePicture: async (file) => {
    try {
      const formData = new FormData()
      formData.append('profile_picture', file)
      // Use raw axios instance to avoid default Content-Type header
      // API_BASE_URL is imported from axiosConfig
      const token = localStorage.getItem('accessToken')
      const response = await rawAxios.patch(`${API_BASE_URL}/auth/profile/`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          // Let browser set Content-Type with boundary automatically
        },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload profile picture' }
    }
  },

  getUserStats: async () => {
    try {
      const response = await apiClient.get('/auth/stats/')
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get user stats' }
    }
  },

  // Google / Firebase authentication
  firebaseLogin: async (idToken) => {
    try {
      const response = await apiClient.post('/auth/firebase/login/', { id_token: idToken })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Google sign-in failed' }
    }
  },

  getUserProfile: async (userId) => {
    try {
      const response = await apiClient.get(`/auth/users/${userId}/profile/`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get user profile' }
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const response = await apiClient.post('/auth/password-reset-request/', { email })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Password reset request failed' }
    }
  },

  confirmPasswordReset: async (resetData) => {
    try {
      const response = await apiClient.post('/auth/password-reset-confirm/', resetData)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Password reset failed' }
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      const response = await apiClient.post('/token/refresh/', { refresh: refreshToken })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Token refresh failed' }
    }
  }
}