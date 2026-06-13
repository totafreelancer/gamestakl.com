import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Trophy, 
  Crown, 
  MessageSquare, 
  Gamepad2, 
  Smartphone, 
  Newspaper,
  Hash,
  X
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose, selectedCategory, onCategoryChange }) => {
  const location = useLocation()

  const categories = [
    { name: 'All', icon: Hash, filter: 'all' },
    { name: 'PC Gaming', icon: Gamepad2, filter: 'PC' },
    { name: 'Mobile Gaming', icon: Smartphone, filter: 'MOBILE' },
    { name: 'Gaming News', icon: Newspaper, filter: 'NEWS' },
    { name: 'General', icon: MessageSquare, filter: 'GENERAL' },
  ]

  const isActive = (path) => location.pathname === path

  const handleCategoryClick = (filter) => {
    if (onCategoryChange) {
      onCategoryChange(filter)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto z-50 transform transition-transform duration-300 dark:bg-dark-800 dark:border-dark-700
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:top-16 md:z-30`}
      >
        <div className="p-4">
          {/* Mobile Close Button */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <nav className="space-y-1">
              <Link
                to="/"
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
              <Link
                to="/tournaments"
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/tournaments') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Tournaments</span>
              </Link>
              <Link
                to="/leaderboard"
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/leaderboard') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span>Leaderboard</span>
              </Link>
              <Link
                to="/messages"
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/messages') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
              </Link>
            </nav>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Categories
            </h3>
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.filter)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    selectedCategory === category.filter
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white'
                  }`}
                >
                  <category.icon className="w-5 h-5" />
                  <span>{category.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-100 rounded-lg p-4 dark:bg-dark-700/50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Platform Stats
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Active Tournaments</span>
              <span className="text-cyan-400 font-medium">12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Players</span>
              <span className="text-purple-400 font-medium">1,234</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Prize Pool</span>
              <span className="text-green-400 font-medium">$50,000</span>
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}

export default Sidebar
