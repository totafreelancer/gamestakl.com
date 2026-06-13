/**
 * WebSocket service for real-time notifications and online status.
 * Connects automatically on user login and disconnects on logout.
 */
class NotificationService {
  constructor() {
    this.ws = null
    this.onlineStatusWs = null
    this.listeners = {
      newMessage: [],
      userOnline: [],
      userOffline: [],
      onlineUsers: [],
    }
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 2000
    this.pingInterval = null
    this.onlineUsers = []
    this.isConnected = false
    this.onInboxUpdate = null  // Callback for inbox refresh
  }

  setInboxUpdateCallback(callback) {
    this.onInboxUpdate = callback
  }

  connect() {
    if (this.isConnected) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

    try {
      this.ws = new WebSocket(`${wsUrl}/ws/notifications/?token=${token}`)

      this.ws.onopen = () => {
        console.log('Notification WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.startPing()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('Notification WebSocket disconnected')
        this.isConnected = false
        this.stopPing()
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('Notification WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect notification WebSocket:', error)
    }
  }

  connectOnlineStatus() {
    if (this.onlineStatusWs && this.onlineStatusWs.readyState === WebSocket.OPEN) return

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

    try {
      this.onlineStatusWs = new WebSocket(`${wsUrl}/ws/online-status/`)

      this.onlineStatusWs.onopen = () => {
        console.log('Online status WebSocket connected')
      }

      this.onlineStatusWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleOnlineStatusMessage(data)
        } catch (e) {
          console.error('Failed to parse online status message:', e)
        }
      }

      this.onlineStatusWs.onclose = () => {
        console.log('Online status WebSocket disconnected')
        setTimeout(() => this.connectOnlineStatus(), 3000)
      }

      this.onlineStatusWs.onerror = (error) => {
        console.error('Online status WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect online status WebSocket:', error)
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'new_message':
        this.listeners.newMessage.forEach((cb) => cb(data))
        // Trigger inbox refresh callback (background, no loading spinner)
        if (this.onInboxUpdate) {
          this.onInboxUpdate(false)
        }
        break
      case 'online_users':
        this.onlineUsers = data.users
        this.listeners.onlineUsers.forEach((cb) => cb(data.users))
        break
      case 'user_online':
        this.listeners.userOnline.forEach((cb) => cb(data))
        break
      case 'user_offline':
        this.listeners.userOffline.forEach((cb) => cb(data))
        break
      case 'pong':
        break
      default:
        break
    }
  }

  handleOnlineStatusMessage(data) {
    switch (data.type) {
      case 'online_users':
        this.onlineUsers = data.users
        this.listeners.onlineUsers.forEach((cb) => cb(data.users))
        break
      case 'user_online':
        if (!this.onlineUsers.find((u) => u.user_id === data.user_id)) {
          this.onlineUsers.push({ user_id: data.user_id, username: data.username })
        }
        this.listeners.userOnline.forEach((cb) => cb(data))
        break
      case 'user_offline':
        this.onlineUsers = this.onlineUsers.filter((u) => u.user_id !== data.user_id)
        this.listeners.userOffline.forEach((cb) => cb(data))
        break
      default:
        break
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * this.reconnectAttempts
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => this.connect(), delay)
    }
  }

  onNewMessage(callback) {
    this.listeners.newMessage.push(callback)
    return () => {
      this.listeners.newMessage = this.listeners.newMessage.filter((cb) => cb !== callback)
    }
  }

  onUserOnline(callback) {
    this.listeners.userOnline.push(callback)
    return () => {
      this.listeners.userOnline = this.listeners.userOnline.filter((cb) => cb !== callback)
    }
  }

  onUserOffline(callback) {
    this.listeners.userOffline.push(callback)
    return () => {
      this.listeners.userOffline = this.listeners.userOffline.filter((cb) => cb !== callback)
    }
  }

  onOnlineUsers(callback) {
    this.listeners.onlineUsers.push(callback)
    return () => {
      this.listeners.onlineUsers = this.listeners.onlineUsers.filter((cb) => cb !== callback)
    }
  }

  isUserOnline(userId) {
    return this.onlineUsers.some((u) => u.user_id === userId)
  }

  getOnlineUsers() {
    return this.onlineUsers
  }

  markAsRead(senderId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'mark_read', sender_id: senderId }))
    }
  }

  disconnect() {
    this.stopPing()
    this.isConnected = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.onlineStatusWs) {
      this.onlineStatusWs.close()
      this.onlineStatusWs = null
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService
