import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { 
  User, 
  LogOut, 
  Settings, 
  Trophy, 
  MessageSquare, 
  Crown,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Send
} from 'lucide-react'
import { socialService } from '../api/social'
import UserAvatar from './UserAvatar'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const result = await socialService.getUnreadCount()
        setUnreadCount(result.unread_count)
      } catch (error) {
        // silently fail
      }
    }
    if (isAuthenticated) {
      fetchUnreadCount()
    }
  }, [isAuthenticated])
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 dark:bg-dark-800/95 dark:border-dark-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              HubZone
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-gray-600 hover:text-cyan-600 transition-colors dark:text-gray-300 dark:hover:text-cyan-400"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Forum</span>
            </Link>
            <Link 
              to="/tournaments" 
              className="flex items-center space-x-2 text-gray-600 hover:text-cyan-600 transition-colors dark:text-gray-300 dark:hover:text-cyan-400"
            >
              <Trophy className="w-5 h-5" />
              <span>Tournaments</span>
            </Link>
            <Link 
              to="/leaderboard" 
              className="flex items-center space-x-2 text-gray-600 hover:text-cyan-600 transition-colors dark:text-gray-300 dark:hover:text-cyan-400"
            >
              <Crown className="w-5 h-5" />
              <span>Leaderboard</span>
            </Link>
            <Link 
              to="/messages" 
              className="flex items-center space-x-2 text-gray-600 hover:text-cyan-600 transition-colors dark:text-gray-300 dark:hover:text-cyan-400 relative"
            >
              <Send className="w-5 h-5" />
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          {/* Right Side: Theme Toggle + User Menu */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-cyan-600 transition-colors dark:bg-dark-700 dark:hover:bg-dark-600 dark:text-gray-300 dark:hover:text-cyan-400"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Menu - Desktop */}
            {isAuthenticated ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors dark:bg-dark-700 dark:hover:bg-dark-600"
                >
                  <UserAvatar 
                    user={user} 
                    size="sm"
                    className="w-8 h-8"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-cyan-400">{user?.points || 0} pts</span>
                      {user?.vip_status && (
                        <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full">
                          VIP
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden dark:bg-dark-800 dark:border-dark-700">
                    <div className="p-3 border-b border-gray-200 dark:border-dark-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">In-Game ID: {user?.in_game_id || 'Not set'}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      {user?.is_staff && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors dark:text-indigo-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                        >
                          <span className="text-base">🛡️</span>
                          <span>Admin Panel</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-200 py-1 dark:border-dark-700">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 hover:text-red-600 transition-colors dark:text-red-400 dark:hover:bg-dark-700 dark:hover:text-red-300"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors dark:bg-dark-700 dark:hover:bg-dark-600 dark:text-gray-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-gray-200 dark:border-dark-700">
            <nav className="space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Forum</span>
              </Link>
              <Link
                to="/tournaments"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white"
              >
                <Trophy className="w-5 h-5" />
                <span>Tournaments</span>
              </Link>
              <Link
                to="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white"
              >
                <Crown className="w-5 h-5" />
                <span>Leaderboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white"
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </Link>
              {user?.is_staff && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors dark:text-indigo-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                >
                  <span className="text-lg">🛡️</span>
                  <span>Admin Panel</span>
                </Link>
              )}
              
              {/* Mobile Auth Buttons */}
              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 dark:border-dark-700 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-2 rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              
              {/* Mobile User Info */}
              {isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium dark:text-white">{user?.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.points || 0} points</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-2 flex items-center space-x-3 px-3 py-2 text-red-500 hover:bg-gray-100 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-dark-700"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
