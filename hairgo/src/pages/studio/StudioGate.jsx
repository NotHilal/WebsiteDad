import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Scissors, Mail, KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function StudioGate() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [studioPass, setStudioPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, isAdmin } = useAuth()
  const navigate = useNavigate()

  const STUDIO_PASSWORD = import.meta.env.VITE_STUDIO_PASSWORD || 'hairgo2024'

  async function handleSubmit(e) {
    e.preventDefault()
    if (studioPass !== STUDIO_PASSWORD) {
      return toast.error('Incorrect studio access code')
    }
    setLoading(true)
    try {
      await signIn(email, password)
      // Auth state update happens async; check profile role after
      setTimeout(() => {
        navigate('/studio/dashboard')
      }, 300)
    } catch (err) {
      toast.error(err.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-[#C9A84C]/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-[#C4956A]/3 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center">
              <Scissors size={18} className="text-black rotate-45" />
            </div>
            <span className="font-display text-3xl text-white">Hair<span className="text-[#C9A84C]">Go</span></span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock size={14} className="text-[#C9A84C]" />
            <h1 className="font-display text-2xl text-white">Studio Access</h1>
          </div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em]">Admin Portal · Restricted Area</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@hairgo.fr"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Account Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Studio Access Code</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="password"
                  value={studioPass}
                  onChange={e => setStudioPass(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-[#C9A84C]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>
              <p className="text-xs text-white/20 mt-1.5">The unique code provided to studio administrators</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Access Studio <Lock size={14} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/15 mt-6">
          HairGo Studio is a restricted management portal.
        </p>
      </motion.div>
    </div>
  )
}
