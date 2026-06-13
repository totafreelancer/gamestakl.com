import { User } from 'lucide-react'

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 md:w-8 md:h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16 md:w-20 md:h-20',
    xl: 'w-20 h-20 md:w-24 md:h-24',
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-bold',
    lg: 'text-2xl md:text-3xl font-bold',
    xl: 'text-3xl md:text-4xl font-bold',
  }

  const profilePicture = user?.profile_picture_url
  const username = typeof user?.username === 'string' ? user?.username : (user?.user?.username || 'U')
  const initial = username.charAt(0).toUpperCase()

  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br from-cyan-500 to-purple-600 ${sizeClasses[size]} ${className}`}
    >
      {profilePicture ? (
        <img
          src={profilePicture}
          alt={user?.username || 'User'}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className={`text-white ${textSizeClasses[size]}`}>
          {initial}
        </span>
      )}
    </div>
  )
}

export default UserAvatar
