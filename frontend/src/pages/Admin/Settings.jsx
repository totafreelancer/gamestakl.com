import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'HubZone',
    siteDescription: 'The ultimate esports and gaming community platform',
    allowRegistration: true,
    requireEmailVerification: false,
    allowGuestBrowsing: true,
    maxPostLength: 5000,
    maxTournamentParticipants: 64,
    maintenanceMode: false,
    autoApprovePosts: false,
    autoApproveComments: true,
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Site Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your website's general settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏗️ General Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Site Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleChange('siteName', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Site Description
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => handleChange('siteDescription', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Registration</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">New users can register</p>
              </div>
              <button
                onClick={() => handleChange('allowRegistration', !settings.allowRegistration)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.allowRegistration ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.allowRegistration ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Verification Required</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Users must verify their email</p>
              </div>
              <button
                onClick={() => handleChange('requireEmailVerification', !settings.requireEmailVerification)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.requireEmailVerification ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Site will be in maintenance mode</p>
              </div>
              <button
                onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Content Settings */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📝 Content Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Post Length (characters)
              </label>
              <input
                type="number"
                value={settings.maxPostLength}
                onChange={(e) => handleChange('maxPostLength', parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Tournament Participants
              </label>
              <input
                type="number"
                value={settings.maxTournamentParticipants}
                onChange={(e) => handleChange('maxTournamentParticipants', parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-approve Posts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Posts will be published automatically</p>
              </div>
              <button
                onClick={() => handleChange('autoApprovePosts', !settings.autoApprovePosts)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoApprovePosts ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.autoApprovePosts ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-approve Comments</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Comments will be published automatically</p>
              </div>
              <button
                onClick={() => handleChange('autoApproveComments', !settings.autoApproveComments)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoApproveComments ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.autoApproveComments ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">⚠️ Danger Zone</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors">
              🗑️ Clear All Cache
            </button>
            <button className="px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors">
              📊 Database Backup
            </button>
            <button className="px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors">
              🔄 System Reset
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
