import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
    </div>
  )

  if (!user || !isAdmin) return <Navigate to="/studio" replace />
  return children
}
