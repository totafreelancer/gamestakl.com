import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../api/auth'
import { toast } from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Helper to fetch the full profile and merge relevant fields into the user state.
  const fetchAndSetUser = async () => {
    const profile = await authService.getProfile()
    // The API returns { user: {...}, points, vip_status, in_game_id, ... }
    // Merge the nested user object with the profile fields so the UI can access
    // points directly via `user.points`.
    const mergedUser = {
      ...(profile.user || {}),
      // Include profile-specific fields, overriding any duplicates from user.
      points: profile.points,
      vip_status: profile.vip_status,
      in_game_id: profile.in_game_id,
    }
    setUser(mergedUser)
    setIsAuthenticated(true)
  }

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (accessToken && refreshToken) {
        try {
          await fetchAndSetUser()
        } catch (error) {
          // Tokens are invalid, clear them
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setUser(null)
          setIsAuthenticated(false)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials)
      
      localStorage.setItem('accessToken', response.access)
      localStorage.setItem('refreshToken', response.refresh)
      // After login, fetch the full profile to obtain points and other fields.
      await fetchAndSetUser()
      
      toast.success('Login successful!')
      return response
    } catch (error) {
      toast.error(error.error || 'Login failed')
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      
      localStorage.setItem('accessToken', response.access)
      localStorage.setItem('refreshToken', response.refresh)
      // After registration, fetch the full profile to include points.
      await fetchAndSetUser()
      
      toast.success('Registration successful!')
      return response
    } catch (error) {
      toast.error(error.error || 'Registration failed')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      setIsAuthenticated(false)
      toast.success('Logged out successfully')
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData)
      // Merge profile fields the same way as fetchAndSetUser so that
      // in_game_id, points, vip_status etc. remain accessible on user state.
      const mergedUser = {
        ...(response.user || {}),
        points: response.points,
        vip_status: response.vip_status,
        in_game_id: response.in_game_id,
      }
      setUser(mergedUser)
      toast.success('Profile updated successfully!')
      return response
    } catch (error) {
      toast.error(error.error || 'Failed to update profile')
      throw error
    }
  }

  // Google / Firebase authentication — used by GoogleAuthButton
  const googleLogin = async (idToken) => {
    try {
      console.log('[AuthContext] googleLogin called, token length:', idToken?.length)
      const response = await authService.firebaseLogin(idToken)
      console.log('[AuthContext] firebaseLogin response:', response)

      if (response.access && response.refresh) {
        localStorage.setItem('accessToken', response.access)
        localStorage.setItem('refreshToken', response.refresh)
      } else {
        console.error('[AuthContext] No tokens in response:', response)
        throw new Error('No authentication tokens received from server')
      }

      // Build user object from response (already includes profile fields)
      const mergedUser = {
        ...(response.user || {}),
        points: response.user?.points,
        vip_status: response.user?.vip_status,
        in_game_id: response.user?.in_game_id,
      }
      setUser(mergedUser)
      setIsAuthenticated(true)

      return response
    } catch (error) {
      console.error('[AuthContext] googleLogin error:', error)
      console.error('[AuthContext] Error response data:', error.response?.data)
      // Don't show toast here — let GoogleAuthButton handle it
      throw error
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    googleLogin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}