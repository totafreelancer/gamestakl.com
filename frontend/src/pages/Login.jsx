import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Trophy, Eye, EyeOff } from 'lucide-react'
import GoogleAuthButton from '../components/GoogleAuthButton'

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { register, handleSubmit, formState: { errors } } = useForm()

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/')
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await login(data)
      navigate('/')
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              HubZone
            </span>
          </Link>
          <p className="text-gray-600 mt-2 dark:text-gray-400">Welcome back, gamer!</p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 dark:bg-dark-800 dark:border-dark-700">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 dark:text-white">Sign In</h2>

          {/* Google Sign-In Button */}
          <GoogleAuthButton
            mode="login"
            onSuccess={() => navigate('/')}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-600" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  placeholder="Enter your email"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 md:py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  placeholder="Enter your password"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-12 py-2.5 md:py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-2.5 md:py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 md:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-dark-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 dark:bg-dark-800 dark:text-gray-500">New to HubZone?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="w-full flex items-center justify-center py-2.5 md:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors dark:border-dark-600 dark:text-white dark:hover:bg-dark-700"
          >
            Create an Account
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-4 md:mt-6 dark:text-gray-500">
          By signing in, you agree to our{' '}
          <a href="#" className="text-cyan-400 hover:text-cyan-300">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-cyan-400 hover:text-cyan-300">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

export default Login
