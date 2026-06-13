import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ChatWidget from './components/ChatWidget'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import Tournaments from './pages/Tournaments'
import TournamentDetail from './pages/TournamentDetail'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminContent from './pages/Admin/Content';
import AdminTournaments from './pages/Admin/Tournaments';
import AdminSettings from './pages/Admin/Settings';
const toastStyles = (isDarkMode) => ({
  position: 'top-right',
  toastOptions: {
    style: isDarkMode
      ? {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155',
        }
      : {
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
    success: {
      style: isDarkMode
        ? { background: '#065f46', color: '#d1fae5' }
        : { background: '#d1fae5', color: '#065f46' },
    },
    error: {
      style: isDarkMode
        ? { background: '#991b1b', color: '#fecaca' }
        : { background: '#fecaca', color: '#991b1b' },
    },
  },
})

function AppContent() {
  const { isDarkMode } = useTheme()

  return (
    <>
      <Routes>
        {/* Admin routes - separate layout, no Navbar/Sidebar/ChatWidget */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Main site routes - with Navbar, Sidebar, ChatWidget */}
        <Route path="/*" element={<MainLayout isDarkMode={isDarkMode} />} />
      </Routes>
      <Toaster {...toastStyles(isDarkMode)} />
    </>
  )
}

function MainLayout({ isDarkMode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 pt-16 transition-colors duration-300">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 md:ml-64">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} /> 
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
