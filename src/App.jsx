import { Routes, Route, Navigate } from 'react-router-dom';
import { LangProvider } from './context/LangContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Booking from './pages/Booking.jsx';
import Shop from './pages/Shop.jsx';
import Messages from './pages/Messages.jsx';
import Rewards from './pages/Rewards.jsx';
import Profile from './pages/Profile.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import AdminGate from './admin/AdminGate.jsx';
import AdminApp from './admin/AdminApp.jsx';
import NotFound from './pages/NotFound.jsx';

// Admin route slug — change this in .env (VITE_ADMIN_ROUTE) for production
const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || 'hg-portal';

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Public site */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/book" element={<Booking />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            {/* Admin portal — secret route, returns 404 to non-admins */}
            <Route path={`/${ADMIN_ROUTE}`} element={<AdminGate />} />
            <Route path={`/${ADMIN_ROUTE}/*`} element={<AdminApp />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  );
}
