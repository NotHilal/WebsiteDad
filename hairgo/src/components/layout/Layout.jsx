import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import ChatWidget from '../chat/ChatWidget'
import { useAuth } from '../../contexts/AuthContext'

const NO_FOOTER = ['/login', '/register']

export default function Layout() {
  const { user }     = useAuth()
  const { pathname } = useLocation()
  const hideFooter   = NO_FOOTER.includes(pathname)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      {user && <ChatWidget />}
    </div>
  )
}
