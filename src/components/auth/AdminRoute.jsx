import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-[#B8D4E8]/30 border-t-[#B8D4E8] rounded-full animate-spin" />
    </div>
  )

  const studioAccess = sessionStorage.getItem('studio_access') === 'true'
  const isStaff = profile?.role === 'admin' || profile?.role === 'artist' || profile?.role === 'manager'

  if (!user) return <Navigate to="/studio" replace />
  if (!studioAccess || !isStaff) return <Navigate to="/studio" replace />

  return children
}
