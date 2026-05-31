import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import ChatWidget from '../chat/ChatWidget'
import { useAuth } from '../../contexts/AuthContext'

const NO_FOOTER = ['/login', '/register']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function Layout() {
  const { user }     = useAuth()
  const { pathname } = useLocation()
  const hideFooter   = NO_FOOTER.includes(pathname)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <ScrollToTop />
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      {user && <ChatWidget />}
    </div>
  )
}
