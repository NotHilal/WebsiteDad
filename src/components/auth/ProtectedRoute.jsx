import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#B8D4E8]/30 border-t-[#B8D4E8] rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
