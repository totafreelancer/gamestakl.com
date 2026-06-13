// ═══════════════════════════════════════════════════════════════════
// WebSocket Configuration — Production Deployment
// Backend: wss://gaming-platform-api-5wie.onrender.com
// ═══════════════════════════════════════════════════════════════════

export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://gaming-platform-api-5wie.onrender.com'

/**
 * Create a WebSocket connection for real-time notifications.
 * @param {string} token - The JWT access token for authentication
 * @returns {WebSocket} A new WebSocket connection
 */
export const getNotificationSocket = (token) => {
  return new WebSocket(`${WS_BASE_URL}/ws/notifications/?token=${token}`)
}

/**
 * Create a WebSocket connection for online status tracking.
 * @returns {WebSocket} A new WebSocket connection
 */
export const getOnlineStatusSocket = () => {
  return new WebSocket(`${WS_BASE_URL}/ws/online-status/`)
}

export default {
  WS_BASE_URL,
  getNotificationSocket,
  getOnlineStatusSocket,
}
