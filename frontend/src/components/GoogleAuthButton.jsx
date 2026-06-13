import { useState, useEffect } from 'react'
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

const GoogleAuthButton = ({ mode = 'login', onSuccess, onError }) => {
  const [loading, setLoading] = useState(false)
  const { googleLogin } = useAuth()

  // Handle redirect result on component mount (for redirect flow)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          setLoading(true)
          const idToken = await result.user.getIdToken()
          const response = await googleLogin(idToken)
          toast.success(mode === 'register' ? 'Account created successfully!' : 'Login successful!')
          if (onSuccess) onSuccess(response)
        }
      } catch (error) {
        console.error('Google redirect auth error:', error)
        // Don't show error on page load if no redirect was initiated
        if (error.code && error.code !== 'auth/no-auth-event') {
          toast.error(error.error || error.message || 'Google sign-in failed.')
        }
      } finally {
        setLoading(false)
      }
    }
    handleRedirectResult()
  }, [])

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      // Step 1: Try popup first
      console.log('[GoogleAuth] Starting signInWithPopup...')
      const result = await signInWithPopup(auth, googleProvider)
      console.log('[GoogleAuth] signInWithPopup success, user:', result.user?.email)

      // Step 2: Get Firebase ID token
      const idToken = await result.user.getIdToken()
      console.log('[GoogleAuth] Got idToken, length:', idToken?.length)

      // Step 3: Send token to backend via AuthContext
      console.log('[GoogleAuth] Calling googleLogin with token...')
      const response = await googleLogin(idToken)
      console.log('[GoogleAuth] googleLogin response:', response)

      toast.success(mode === 'register' ? 'Account created successfully!' : 'Login successful!')
      if (onSuccess) onSuccess(response)
    } catch (error) {
      console.error('[GoogleAuth] Full error:', error)
      console.error('[GoogleAuth] Error code:', error.code)
      console.error('[GoogleAuth] Error message:', error.message)
      console.error('[GoogleAuth] Error response:', error.response?.data)

      // If popup is blocked or COOP error, fall back to redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || (error.message && error.message.includes('Cross-Origin-Opener-Policy'))) {
        try {
          console.log('[GoogleAuth] Falling back to redirect...')
          await signInWithRedirect(auth, googleProvider)
          // Page will redirect — the useEffect above will handle the result
          return
        } catch (redirectError) {
          console.error('[GoogleAuth] Google redirect error:', redirectError)
          toast.error('Google sign-in failed. Please try again.')
        }
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error('An account already exists with this email using a different sign-in method.')
      } else {
        // Handle backend API errors (from Axios)
        const backendError = error.response?.data?.error || error.error
        const errorMsg = backendError || error.message || 'Google sign-in failed. Please try again.'
        console.error('[GoogleAuth] Showing error:', errorMsg)
        toast.error(errorMsg)
      }

      if (onError) onError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-dark-700 dark:border-dark-600 dark:hover:bg-dark-600 dark:hover:border-dark-500"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-cyan-500 rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {loading
          ? 'Signing in...'
          : mode === 'register'
            ? 'Sign up with Google'
            : 'Continue with Google'}
      </span>
    </button>
  )
}

export default GoogleAuthButton
