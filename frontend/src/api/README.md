# API Usage Guide

## Environment Variable

All API calls use `VITE_API_URL` from your `.env` file:

```
VITE_API_URL=http://localhost:8000/api   # local development
VITE_API_URL=https://your-app.onrender.com/api   # production (Render)
```

Vite automatically exposes any env var prefixed with `VITE_` via `import.meta.env`.

## Using the Pre-configured Axios Instance (Recommended)

The `axios.js` module exports a pre-configured `api` instance with:
- Base URL from `VITE_API_URL`
- Automatic JWT `Authorization` header injection
- Automatic token refresh on 401 responses
- FormData content-type handling

```jsx
// In any component or service file:
import api from '../api/axios'

// GET request
const response = await api.get('/tournaments/')
const data = response.data

// POST request
const response = await api.post('/auth/login/', {
  email: 'user@example.com',
  password: 'password123',
})

// PUT/PATCH request
const response = await api.patch('/profile/', { display_name: 'NewName' })

// DELETE request
await api.delete('/posts/42/')
```

## Using the API Service Modules

For better organization, use the service modules which wrap the axios instance:

```jsx
import { authService } from '../api/auth'
import { tournamentService } from '../api/tournaments'
import { chatService } from '../api/chat'
import { forumService } from '../api/forum'

// Login
const user = await authService.login({ email, password })

// Fetch tournaments
const tournaments = await tournamentService.getTournaments({ status: 'active' })

// Fetch conversations
const conversations = await chatService.getConversations()
```

## Using Fetch Instead of Axios

If you prefer the native `fetch` API:

```jsx
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken')
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}

// Usage
const tournaments = await fetchWithAuth('/tournaments/')
const newPost = await fetchWithAuth('/forum/posts/', {
  method: 'POST',
  body: JSON.stringify({ title: 'Hello', content: 'World' }),
})
```

## File Uploads

For file uploads (images, etc.), use the `rawAxios` export to avoid the default JSON Content-Type:

```jsx
import api, { rawAxios } from '../api/axios'

const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  
  const response = await api.post('/upload/', formData)
  // The interceptor automatically removes Content-Type for FormData
  // so the browser sets the correct multipart boundary
  return response.data
}
```

## Vercel Deployment

1. Go to **Vercel Dashboard → Project → Settings → Environment Variables**
2. Add `VITE_API_URL` = `https://your-render-app.onrender.com/api`
3. Redeploy — Vite bakes the value into the build at compile time

> **Important:** Env vars are embedded at build time, not runtime.
> Changing `VITE_API_URL` requires a redeploy.
