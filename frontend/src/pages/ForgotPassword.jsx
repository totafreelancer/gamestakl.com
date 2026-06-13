import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Trophy, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { authService } from '../api/auth'
import toast from 'react-hot-toast'

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await authService.requestPasswordReset(data.email)
      setSubmittedEmail(data.email)
      setEmailSent(true)
      toast.success('Password reset email sent!')
    } catch (error) {
      const message = error?.error || error?.message || 'Failed to send reset email'
      toast.error(message)
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
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 dark:bg-dark-800 dark:border-dark-700">
          {emailSent ? (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 dark:text-white">
                Check Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We've sent a password reset link to{' '}
                <span className="font-semibold text-cyan-500">{submittedEmail}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setEmailSent(false)
                    setSubmittedEmail('')
                  }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold py-2.5 md:py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Try Another Email
                </button>
                <Link
                  to="/login"
                  className="flex items-center justify-center space-x-2 w-full border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 md:py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 dark:text-white">
                Forgot Password?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6">
                No worries! Enter your email address and we'll send you a link to reset your password.
              </p>

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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold py-2.5 md:py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>

                {/* Back to Login */}
                <Link
                  to="/login"
                  className="flex items-center justify-center space-x-2 w-full border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 md:py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
