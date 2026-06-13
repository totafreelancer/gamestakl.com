import { useState, useEffect } from 'react';
import { getDashboardStats, getRecentActivity } from '../../api/admin';

const statCards = [
  { key: 'total_users', label: 'Total Users', icon: '👥', color: 'bg-blue-500', lightColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'total_posts', label: 'Total Posts', icon: '📝', color: 'bg-green-500', lightColor: 'bg-green-50 dark:bg-green-900/20' },
  { key: 'total_tournaments', label: 'Total Tournaments', icon: '🏆', color: 'bg-yellow-500', lightColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { key: 'total_messages', label: 'Total Messages', icon: '💬', color: 'bg-purple-500', lightColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { key: 'active_users', label: 'Active Users', icon: '✅', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'banned_users', label: 'Banned Users', icon: '🚫', color: 'bg-red-500', lightColor: 'bg-red-50 dark:bg-red-900/20' },
  { key: 'published_posts', label: 'Published Posts', icon: '📰', color: 'bg-teal-500', lightColor: 'bg-teal-50 dark:bg-teal-900/20' },
  { key: 'active_tournaments', label: 'Active Tournaments', icon: '⚡', color: 'bg-orange-500', lightColor: 'bg-orange-50 dark:bg-orange-900/20' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View overall site statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className={`${card.lightColor} rounded-xl p-5 border border-gray-200 dark:border-dark-700`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.[card.key]?.toLocaleString() || 0}
                </p>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* User Growth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 border border-gray-200 dark:border-dark-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">New Users Today</h3>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            +{stats?.new_users_today || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 border border-gray-200 dark:border-dark-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">New This Week</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            +{stats?.new_users_week || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl p-5 border border-gray-200 dark:border-dark-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">New This Month</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            +{stats?.new_users_month || 0}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">🆕 Recent Users</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {activity?.recent_users?.map((user) => (
              <div key={user.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  user.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {user.is_active ? 'Active' : 'Banned'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">📝 Recent Posts</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {activity?.recent_posts?.map((post) => (
              <div key={post.id} className="p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {post.title}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{post.author_name}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    !post.is_flagged
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {!post.is_flagged ? 'Published' : 'Unpublished'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tournaments */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">🏆 Recent Tournaments</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {activity?.recent_tournaments?.map((tournament) => (
              <div key={tournament.id} className="p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {tournament.title}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tournament.game_name} • {tournament.participants_count} participants
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tournament.status === 'IN_PROGRESS'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : tournament.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tournament.status === 'IN_PROGRESS' ? 'In Progress' : tournament.status === 'COMPLETED' ? 'Completed' : tournament.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
