import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Appointments from './pages/Appointments'
import Store from './pages/Store'
import Stylists from './pages/Stylists'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import StudioGate from './pages/studio/StudioGate'
import StudioLayout from './pages/studio/StudioLayout'
import StudioDashboard from './pages/studio/StudioDashboard'
import StudioProducts from './pages/studio/StudioProducts'
import StudioGallery from './pages/studio/StudioGallery'
import StudioMessages from './pages/studio/StudioMessages'
import StudioCoupons from './pages/studio/StudioCoupons'
import StudioUsers from './pages/studio/StudioUsers'
import StudioServices from './pages/studio/StudioServices'
import StudioStylists from './pages/studio/StudioStylists'
import StudioBlockedDates from './pages/studio/StudioBlockedDates'
import StudioSales from './pages/studio/StudioSales'
import StudioAppointmentsList from './pages/studio/StudioAppointmentsList'
import StudioSchedule from './pages/studio/StudioSchedule'
import StudioOrders from './pages/studio/StudioOrders'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import AdminOnlyRoute from './components/auth/AdminOnlyRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#f5f5f5',
              border: '1px solid rgba(201,168,76,0.2)',
              fontFamily: 'Jost, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0a0a0a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } },
          }}
        />
        <Routes>
          {/* Public routes with main layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="store" element={<Store />} />
            <Route path="stylists" element={<Stylists />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Route>

          {/* Studio (admin) routes */}
          <Route path="/studio" element={<StudioGate />} />
          <Route path="/studio/*" element={<AdminRoute><StudioLayout /></AdminRoute>}>
            <Route path="dashboard"    element={<StudioDashboard />} />
            <Route path="appointments" element={<AdminRoute><StudioAppointmentsList /></AdminRoute>} />
            <Route path="schedule"     element={<StudioSchedule />} />
            <Route path="sales"        element={<AdminOnlyRoute><StudioSales /></AdminOnlyRoute>} />
            <Route path="blocked-dates" element={<AdminOnlyRoute><StudioBlockedDates /></AdminOnlyRoute>} />
            <Route path="services"  element={<AdminOnlyRoute><StudioServices /></AdminOnlyRoute>} />
            <Route path="stylists"  element={<AdminOnlyRoute><StudioStylists /></AdminOnlyRoute>} />
            <Route path="products"  element={<AdminOnlyRoute><StudioProducts /></AdminOnlyRoute>} />
            <Route path="orders"    element={<AdminOnlyRoute><StudioOrders /></AdminOnlyRoute>} />
            <Route path="gallery"   element={<AdminOnlyRoute><StudioGallery /></AdminOnlyRoute>} />
            <Route path="messages"  element={<AdminOnlyRoute><StudioMessages /></AdminOnlyRoute>} />
            <Route path="coupons"   element={<AdminOnlyRoute><StudioCoupons /></AdminOnlyRoute>} />
            <Route path="users"     element={<AdminOnlyRoute><StudioUsers /></AdminOnlyRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
