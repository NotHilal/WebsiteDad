import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ManagerRoute({ children }) {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-6 h-6 border-2 border-[#B8D4E8]/30 border-t-[#B8D4E8] rounded-full animate-spin" />
    </div>
  )

  if (profile?.role !== 'admin' && profile?.role !== 'manager') return <Navigate to="/studio/dashboard" replace />

  return children
}
