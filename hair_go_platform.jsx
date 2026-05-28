import { useState } from 'react';
import {
  Calendar, Clock, Scissors, Sparkles, ChevronRight, ChevronLeft, Star,
  Search, Bell, Plus, MoreHorizontal, TrendingUp, TrendingDown, Users,
  DollarSign, ShoppingBag, AlertTriangle, Mail, MessageSquare, Phone,
  Facebook, Send, Filter, Edit, ArrowUpRight, Check, Package, Truck,
  BarChart3, Home, MapPin, Heart, Gift, Zap, Instagram, Globe,
  ChevronDown, CheckCircle2, CircleDot, Tag, CreditCard, Award,
  ArrowRight, Layers, Megaphone, UserPlus, Repeat, CalendarDays, Coffee,
  Lock, BellOff, BellRing, GripVertical, Receipt, Wallet, Percent,
  Smartphone, Banknote, Paperclip, Smile, Image as ImageIcon,
  MoreVertical, Archive, Inbox, AtSign, CheckCheck, X, Pause, Play,
  Shield, ShieldCheck, ShieldAlert, Server, Database, Key, LogOut,
  Eye, EyeOff, Fingerprint, Monitor, Tablet, Laptop, Wifi, WifiOff,
  HardDrive, Cpu, Activity, RefreshCw, CloudOff, Cloud, Settings, FileText,
  Hand, Sparkle, Droplet, Flower, Flower2, Camera, Aperture
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip,
  XAxis, YAxis, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

/* =========================================================
   HAIR GO — Plateforme intégrée
   Inspiré de Fresha, Square Appointments, Phorest, Timely
   Direction artistique : éditorial / luxe / chaleur terre
   ========================================================= */

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,800;9..144,900&family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
  .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.02em; }
  .font-body { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; }
  .num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
  .grain {
    background-image: radial-gradient(rgba(26,20,16,0.025) 1px, transparent 1px);
    background-size: 3px 3px;
  }
  @keyframes fadeUp { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform: translateY(0);} }
  .fade-up { animation: fadeUp 0.5s ease-out both; }
  .stagger > * { opacity: 0; animation: fadeUp 0.6s ease-out forwards; }
  .stagger > *:nth-child(1) { animation-delay: 0.05s; }
  .stagger > *:nth-child(2) { animation-delay: 0.12s; }
  .stagger > *:nth-child(3) { animation-delay: 0.19s; }
  .stagger > *:nth-child(4) { animation-delay: 0.26s; }
  .stagger > *:nth-child(5) { animation-delay: 0.33s; }
  .stagger > *:nth-child(6) { animation-delay: 0.40s; }
`;

const C = {
  cream:    '#F7F2EB',
  paper:    '#FBF8F2',
  ink:      '#1A1410',
  inkSoft:  '#3A322B',
  muted:    '#7A6F63',
  bronze:   '#B5754A',
  bronzeDk: '#8E5836',
  forest:   '#2E3A2E',
  linen:    '#EDE4D5',
  linenDk:  '#DDD0BC',
  clay:     '#C4684F',
  rose:     '#D8A48F',
  sage:     '#8C9A7E',
  gold:     '#C9A961',
};

/* ----------------- ROOT ----------------- */
export default function HairGoPlatform() {
  const [session, setSession] = useState(null); // { user, role, device }
  const [view, setView] = useState('site');

  // Définition des permissions par rôle
  const PERMISSIONS = {
    admin:    ['site','calendar','pos','connect','rewards','dashboard','stock','marketing','clients','admin'],
    manager:  ['site','calendar','pos','connect','rewards','dashboard','stock','marketing','clients'],
    staff:    ['calendar','pos','connect','clients'],
  };

  // Si pas connecté → écran de login
  if (!session) {
    return (
      <div className="font-body min-h-screen" style={{ background: C.cream, color: C.ink }}>
        <style>{FONTS}</style>
        <LoginScreen onLogin={(s) => {
          setSession(s);
          setView(s.role === 'staff' ? 'calendar' : 'dashboard');
        }}/>
      </div>
    );
  }

  // Si l'onglet demandé n'est pas autorisé pour ce rôle, on bloque
  const allowed = PERMISSIONS[session.role] || [];
  const safeView = allowed.includes(view) ? view : allowed[0];

  return (
    <div className="font-body min-h-screen" style={{ background: C.cream, color: C.ink }}>
      <style>{FONTS}</style>
      <TopBar
        view={safeView}
        setView={setView}
        session={session}
        onLogout={() => setSession(null)}
        allowed={allowed}
      />
      <div className="grain">
        {safeView === 'site' && <ClientSite />}
        {safeView === 'calendar' && <CalendarView />}
        {safeView === 'pos' && <POSView />}
        {safeView === 'connect' && <ConnectView />}
        {safeView === 'rewards' && <RewardsView />}
        {safeView === 'dashboard' && <Dashboard />}
        {safeView === 'stock' && <StockView />}
        {safeView === 'marketing' && <MarketingView />}
        {safeView === 'clients' && <ClientsView />}
        {safeView === 'admin' && <AdminView session={session}/>}
      </div>
      <Footer/>
    </div>
  );
}

/* ----------------- TOP BAR / NAV ----------------- */
function TopBar({ view, setView, session, onLogout, allowed }) {
  const allTabs = [
    { id: 'site', label: 'Site', icon: Globe },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'pos', label: 'POS', icon: CreditCard },
    { id: 'connect', label: 'Connect', icon: Inbox },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'stock', label: 'Inventory', icon: Package },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'admin', label: 'Admin', icon: Shield },
  ];
  const tabs = allTabs.filter(t => allowed.includes(t.id));
  const roleConfig = {
    admin: { label: 'Admin', color: C.ink, bg: C.gold },
    manager: { label: 'Manager', color: '#fff', bg: C.bronze },
    staff: { label: 'Staff', color: '#fff', bg: C.sage },
  };
  const r = roleConfig[session.role];

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md border-b"
         style={{ background: 'rgba(247,242,235,0.92)', borderColor: C.linenDk }}>
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
               style={{ background: C.ink }}>
            <Scissors size={16} color={C.cream} strokeWidth={1.5}/>
          </div>
          <div>
            <div className="font-display text-xl leading-none" style={{ color: C.ink }}>Hair Go</div>
            <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: C.muted }}>Whangaparāoa</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 rounded-full overflow-x-auto"
             style={{ background: C.linen }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-all flex-shrink-0"
                    style={{
                      background: view === t.id ? C.ink : 'transparent',
                      color: view === t.id ? C.cream : C.inkSoft,
                    }}>
              <t.icon size={14} strokeWidth={1.75}/>
              <span className="hidden lg:inline text-xs">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
               style={{ background: C.sage+'25', color: C.forest }}>
            <ShieldCheck size={11}/> Encrypted
          </div>
          <button className="p-2 rounded-full hover:bg-black/5 relative">
            <Bell size={18} strokeWidth={1.5}/>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{background: C.clay}}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right hidden md:block">
              <div className="text-xs leading-tight font-medium">{session.user}</div>
              <div className="text-[10px] px-1.5 py-0.5 rounded-full inline-block"
                   style={{background: r.bg, color: r.color}}>{r.label}</div>
            </div>
            <button onClick={onLogout}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold relative group"
                    style={{ background: r.bg, color: r.color }}
                    title="Log out">
              {session.user.split(' ').map(n=>n[0]).join('').slice(0,2)}
              <span className="absolute top-full right-0 mt-2 px-2 py-1 rounded-md text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                    style={{background: C.ink, color: C.cream}}>
                Click to log out
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   0. LOGIN — Multi-rôle avec PIN tablette pour staff
   ============================================================ */
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('select'); // select | password | pin
  const [role, setRole] = useState(null);
  const [pin, setPin] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const roles = [
    {
      id: 'admin',
      title: 'Admin',
      subtitle: 'Hazzaa El Abed',
      desc: 'Full access · all modules · server controls',
      color: C.gold,
      icon: ShieldAlert,
      method: 'password',
      anywhere: true,
    },
    {
      id: 'manager',
      title: 'Salon Manager',
      subtitle: 'Nina',
      desc: 'Operations · clients · marketing · reports',
      color: C.bronze,
      icon: ShieldCheck,
      method: 'password',
      anywhere: true,
    },
    {
      id: 'staff',
      title: 'Staff',
      subtitle: 'Stylists & front desk',
      desc: 'On-site only · PIN on registered iPad',
      color: C.sage,
      icon: Shield,
      method: 'pin',
      anywhere: false,
      onSiteOnly: true,
    },
  ];

  // Simulation : on suppose qu'on est au salon. Mettre à false pour démo "hors salon".
  const isOnSiteNetwork = true; // ← IP publique = IP fixe Coast Plaza + WiFi BSSID match
  const isRegisteredDevice = true; // ← UUID iPad whitelisté

  const handleSelect = (r) => {
    if (r.onSiteOnly && !isOnSiteNetwork) {
      return; // Bloqué côté backend de toute façon
    }
    setRole(r);
    setMode(r.method);
  };

  const handlePinDigit = (d) => {
    if (d === 'clear') { setPin(''); return; }
    if (d === 'back')  { setPin(pin.slice(0,-1)); return; }
    if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => onLogin({ user: 'Sarah Williams', role: 'staff', device: 'iPad Pro · Front Desk' }), 250);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${C.cream} 0%, ${C.linen} 100%)`
      }}/>
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 20% 30%, ${C.bronze}30, transparent 40%), radial-gradient(circle at 80% 70%, ${C.forest}25, transparent 45%)`
      }}/>
      <div className="absolute inset-0 grain"/>

      {/* Brand */}
      <div className="relative max-w-md mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
             style={{background: C.ink}}>
          <Scissors size={22} color={C.cream} strokeWidth={1.5}/>
        </div>
        <div className="font-display text-4xl leading-none">Hair Go</div>
        <div className="text-[10px] tracking-[0.25em] uppercase mt-2" style={{color: C.muted}}>
          Salon Operations · Whangaparāoa
        </div>
      </div>

      {/* Card */}
      <div className="relative max-w-md mx-auto px-6 pb-12">
        <div className="rounded-3xl border p-8 shadow-xl"
             style={{borderColor: C.linenDk, background: 'rgba(251,248,242,0.85)', backdropFilter:'blur(20px)'}}>

          {mode === 'select' && (
            <div className="fade-up">
              <h2 className="font-display text-2xl">Welcome back</h2>
              <p className="text-xs mt-1 mb-4" style={{color: C.muted}}>Select your role to continue.</p>

              {/* Network status banner */}
              <div className="mb-5 p-3 rounded-2xl border flex items-center gap-3"
                   style={{
                     borderColor: isOnSiteNetwork ? C.sage+'40' : C.clay+'40',
                     background:  isOnSiteNetwork ? C.sage+'12' : C.clay+'12',
                   }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{background: isOnSiteNetwork ? C.sage : C.clay, color:'#fff'}}>
                  {isOnSiteNetwork ? <Wifi size={13}/> : <WifiOff size={13}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">
                    {isOnSiteNetwork ? 'Salon network detected' : 'Off-site connection'}
                  </div>
                  <div className="text-[10px]" style={{color: C.muted}}>
                    {isOnSiteNetwork
                      ? 'Coast Plaza · WiFi "HairGo-Pro" · IP 27.x.x.x'
                      : 'Staff sign-in disabled. Admin/Manager only.'}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {roles.map(r => {
                  const blocked = r.onSiteOnly && !isOnSiteNetwork;
                  return (
                    <button key={r.id} onClick={() => handleSelect(r)}
                            disabled={blocked}
                            className="w-full text-left p-4 rounded-2xl border transition-all group relative"
                            style={{
                              borderColor: C.linenDk,
                              background: C.paper,
                              opacity: blocked ? 0.45 : 1,
                              cursor: blocked ? 'not-allowed' : 'pointer',
                            }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                             style={{background: r.color, color: r.id==='admin'?C.ink:'#fff'}}>
                          <r.icon size={18}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-sm">{r.title}</div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{background: r.id==='staff' ? C.linen : C.cream, color: C.muted, border: `1px solid ${C.linenDk}`}}>
                              {r.method === 'pin' ? 'PIN' : 'Password'}
                            </span>
                            {r.onSiteOnly && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                    style={{background: C.gold+'25', color: '#7a6018'}}>
                                <MapPin size={9}/> On-site only
                              </span>
                            )}
                            {r.anywhere && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                    style={{background: C.linen, color: C.inkSoft}}>
                                <Globe size={9}/> Anywhere
                              </span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{color: C.inkSoft}}>{r.subtitle}</div>
                          <div className="text-[10px] mt-0.5" style={{color: C.muted}}>{r.desc}</div>
                        </div>
                        {blocked
                          ? <Lock size={14} color={C.clay}/>
                          : <ChevronRight size={16} color={C.muted} className="group-hover:translate-x-1 transition-transform"/>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 pt-5 border-t flex items-center gap-4 text-[10px] flex-wrap"
                   style={{borderColor: C.linenDk, color: C.muted}}>
                <div className="flex items-center gap-1"><Server size={10}/> hairgo.o2switch.net</div>
                <div className="flex items-center gap-1"><Lock size={10}/> TLS 1.3</div>
                <div className="flex items-center gap-1"><Wifi size={10}/> Online</div>
              </div>
            </div>
          )}

          {mode === 'password' && role && (
            <div className="fade-up">
              <button onClick={() => { setRole(null); setMode('select'); }}
                      className="flex items-center gap-1 text-xs mb-4" style={{color: C.muted}}>
                <ChevronLeft size={12}/> Back
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{background: role.color, color: role.id==='admin'?C.ink:'#fff'}}>
                  <role.icon size={18}/>
                </div>
                <div>
                  <h2 className="font-display text-xl leading-tight">{role.title} login</h2>
                  <div className="text-[11px]" style={{color: C.muted}}>{role.subtitle}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] tracking-wider uppercase mb-1.5 block" style={{color: C.muted}}>
                    Email
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                       style={{borderColor: C.linenDk, background: C.cream}}>
                    <AtSign size={14} color={C.muted}/>
                    <input type="email"
                           defaultValue={role.id==='admin' ? 'hazzaa@hairgo.co.nz' : 'nina@hairgo.co.nz'}
                           className="flex-1 bg-transparent text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-wider uppercase mb-1.5 block" style={{color: C.muted}}>
                    Password
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                       style={{borderColor: C.linenDk, background: C.cream}}>
                    <Key size={14} color={C.muted}/>
                    <input type={showPwd ? 'text' : 'password'}
                           defaultValue="••••••••••••"
                           className="flex-1 bg-transparent text-sm outline-none"/>
                    <button onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={14} color={C.muted}/> : <Eye size={14} color={C.muted}/>}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2" style={{color: C.inkSoft}}>
                    <input type="checkbox" defaultChecked className="rounded"/>
                    Trust this device for 30 days
                  </label>
                  <button className="underline" style={{color: C.muted}}>Forgot?</button>
                </div>

                <button onClick={() => onLogin({
                          user: role.id === 'admin' ? 'Hazzaa El Abed' : 'Nina Papio',
                          role: role.id,
                          device: 'MacBook · Doha office'
                        })}
                        className="w-full py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 mt-3"
                        style={{background: C.ink, color: C.cream}}>
                  <Lock size={13}/> Sign in securely
                </button>

                <div className="text-center pt-3">
                  <div className="text-[10px] flex items-center justify-center gap-1.5" style={{color: C.muted}}>
                    <Fingerprint size={11}/> 2-factor code will be sent via SMS / WhatsApp
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'pin' && role && (
            <div className="fade-up">
              <button onClick={() => { setRole(null); setMode('select'); setPin(''); }}
                      className="flex items-center gap-1 text-xs mb-4" style={{color: C.muted}}>
                <ChevronLeft size={12}/> Back
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{background: role.color, color:'#fff'}}>
                  <Tablet size={18}/>
                </div>
                <div>
                  <h2 className="font-display text-xl leading-tight">Tablet sign-in</h2>
                  <div className="text-[11px]" style={{color: C.muted}}>Enter your 4-digit PIN</div>
                </div>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 my-6">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-3.5 h-3.5 rounded-full transition-all"
                       style={{
                         background: i < pin.length ? C.ink : 'transparent',
                         border: `2px solid ${i < pin.length ? C.ink : C.linenDk}`,
                       }}/>
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {['1','2','3','4','5','6','7','8','9','clear','0','back'].map(d => (
                  <button key={d} onClick={() => handlePinDigit(d)}
                          className="aspect-square rounded-2xl text-xl font-display flex items-center justify-center transition-all active:scale-95"
                          style={{
                            background: (d === 'clear' || d === 'back') ? 'transparent' : C.cream,
                            border: `1px solid ${C.linenDk}`,
                            color: C.ink,
                          }}>
                    {d === 'clear' ? <X size={16} color={C.muted}/> :
                     d === 'back' ? <ChevronLeft size={16} color={C.muted}/> :
                     d}
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t" style={{borderColor: C.linenDk}}>
                <div className="text-[10px] tracking-wider uppercase mb-2" style={{color: C.muted}}>This device</div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: C.linen}}>
                    <Tablet size={12}/>
                  </div>
                  <div>
                    <div>iPad Pro · Front Desk</div>
                    <div className="text-[10px]" style={{color: C.muted}}>Registered · Salon WiFi</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom trust strip */}
        <div className="mt-5 text-center text-[10px]" style={{color: C.muted}}>
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="flex items-center gap-1"><Database size={10}/> Self-hosted NZ</span>
            <span>·</span>
            <span className="flex items-center gap-1"><ShieldCheck size={10}/> Privacy Act 2020</span>
            <span>·</span>
            <span>v 1.0.0</span>
          </div>
          <div>© 2026 HEA Holdings Limited</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   1. CLIENT SITE — Booking experience (Fresha / Square style)
   ============================================================ */
function ClientSite() {
  return (
    <div>
      <Hero />
      <BookingFlow />
      <ServicesShowcase />
      <Universe />
      <Lookbook />
      <StylistsRow />
      <Reviews />
      <LocationHours />
    </div>
  );
}

/* ----- UNIVERSE — 4 grands univers de services ----- */
function Universe() {
  const universes = [
    {
      name:'Hair',
      tagline:'Cut · Colour · Bridal',
      count:'9 services',
      desc:'From classic cuts to full transformation.',
      bg:'linear-gradient(135deg, #B5754A 0%, #8E5836 60%, #5A3D26 100%)',
      tint:'radial-gradient(circle at 30% 25%, rgba(255,240,200,0.45), transparent 55%)',
      icon: Scissors,
    },
    {
      name:'Make-up',
      tagline:'Bridal · Evening · Day',
      count:'6 services',
      desc:'Skin-first, photo-ready, all-day wear.',
      bg:'linear-gradient(135deg, #D8A48F 0%, #C4684F 60%, #8E2A1F 100%)',
      tint:'radial-gradient(circle at 70% 30%, rgba(255,220,200,0.5), transparent 55%)',
      icon: Heart,
    },
    {
      name:'Massage',
      tagline:'Swedish · Deep tissue · Hot stone',
      count:'5 services',
      desc:'Therapeutic touch by trained therapists.',
      bg:'linear-gradient(135deg, #8C9A7E 0%, #6B7A5E 60%, #2E3A2E 100%)',
      tint:'radial-gradient(circle at 50% 30%, rgba(220,230,200,0.4), transparent 55%)',
      icon: Hand,
    },
    {
      name:'Body & skin',
      tagline:'Scrubs · Wraps · Facials',
      count:'4 services',
      desc:'NZ-sourced ingredients, ritual-led.',
      bg:'linear-gradient(135deg, #C9A961 0%, #8C9A7E 60%, #2E3A2E 100%)',
      tint:'radial-gradient(circle at 50% 70%, rgba(255,240,200,0.4), transparent 55%)',
      icon: Sparkle,
    },
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-20">
      <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Our universes</div>
          <h2 className="font-display text-5xl mt-2 leading-none">
            Four worlds<br/>
            <em style={{color: C.bronze}}>under one roof.</em>
          </h2>
          <p className="text-sm mt-3 max-w-md" style={{color: C.muted}}>
            Whether you're after a colour transformation, a wedding-day glow, or a deep release,
            we've curated specialists for each.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {universes.map((u, i) => (
          <div key={u.name}
               className="relative rounded-3xl overflow-hidden cursor-pointer group transition-all hover:shadow-2xl hover:-translate-y-1"
               style={{ aspectRatio: '4/5', background: u.bg }}>
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: u.tint }}/>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.65) 100%)'
            }}/>

            {/* Top icon + count */}
            <div className="absolute top-5 left-5 right-5 flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md"
                   style={{background: 'rgba(255,255,255,0.18)'}}>
                <u.icon size={18} color="#fff" strokeWidth={1.5}/>
              </div>
              <span className="text-[10px] tracking-wider uppercase px-2 py-1 rounded-full backdrop-blur-md text-white"
                    style={{background: 'rgba(0,0,0,0.25)'}}>
                {u.count}
              </span>
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="font-display text-3xl leading-none">{u.name}</div>
              <div className="text-[11px] opacity-80 mt-1.5">{u.tagline}</div>
              <p className="text-xs opacity-75 mt-3 leading-snug">{u.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs opacity-90 group-hover:translate-x-1 transition-transform">
                Explore <ArrowRight size={12}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-12 grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 stagger">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-wide"
               style={{ background: C.linen, color: C.inkSoft }}>
            <Sparkles size={12}/> Coast Plaza · est. 2014
          </div>
          <h1 className="font-display mt-6 leading-[0.95]" style={{ fontSize: 'clamp(48px, 7vw, 92px)' }}>
            Where the coast<br/>
            <em style={{ color: C.bronze }}>meets your hair.</em>
          </h1>
          <p className="mt-6 text-lg max-w-xl" style={{ color: C.inkSoft }}>
            A modern salon on Whangaparāoa Peninsula. Cut, colour, balayage and
            bridal — bookable online in under sixty seconds.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <button className="px-6 py-3.5 rounded-full text-sm font-medium flex items-center gap-2 group"
                    style={{ background: C.ink, color: C.cream }}>
              Book your visit
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/>
            </button>
            <button className="px-6 py-3.5 rounded-full text-sm font-medium border"
                    style={{ borderColor: C.ink, color: C.ink }}>
              Browse services
            </button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm" style={{ color: C.muted }}>
            <div className="flex items-center gap-2"><Star size={14} fill={C.gold} color={C.gold}/> 4.9 · 312 reviews</div>
            <div className="flex items-center gap-2"><Clock size={14}/> Open until 6pm today</div>
          </div>
        </div>
        <div className="md:col-span-5 relative fade-up">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden"
               style={{ background: `linear-gradient(160deg, ${C.bronze} 0%, ${C.clay} 45%, ${C.forest} 100%)` }}>
            <div className="absolute inset-0 opacity-30"
                 style={{ backgroundImage: `radial-gradient(circle at 30% 20%, ${C.gold}, transparent 50%), radial-gradient(circle at 80% 90%, ${C.rose}, transparent 60%)` }}/>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="text-xs tracking-[0.2em] uppercase opacity-70">Next available</div>
              <div className="font-display text-3xl mt-1">Today, 2:30 PM</div>
              <div className="text-sm opacity-80 mt-1">Cut & Style with Nina · 45 min</div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-2xl p-4 backdrop-blur-md"
               style={{ background: 'rgba(255,255,255,0.8)', boxShadow: '0 20px 40px rgba(26,20,16,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background: C.linen}}>
                <Heart size={16} color={C.clay}/>
              </div>
              <div>
                <div className="text-xs" style={{color: C.muted}}>Loyalty members</div>
                <div className="font-display text-lg">1,842 strong</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingFlow() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState({ service: null, stylist: null, date: null, time: null });
  const steps = ['Service', 'Stylist', 'Date & time', 'Confirm'];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-16">
      <div className="rounded-3xl overflow-hidden border" style={{ background: C.paper, borderColor: C.linenDk }}>
        <div className="px-8 pt-8 pb-4 border-b" style={{ borderColor: C.linenDk }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Online booking</div>
              <h2 className="font-display text-4xl mt-1">Reserve in 4 steps</h2>
            </div>
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                       style={{
                         background: i <= step ? C.ink : 'transparent',
                         color: i <= step ? C.cream : C.muted,
                         border: i <= step ? 'none' : `1px solid ${C.linenDk}`,
                       }}>
                    {i < step ? <Check size={12}/> : <span className="num">{i+1}</span>} {s}
                  </div>
                  {i < steps.length - 1 && <ChevronRight size={12} color={C.muted}/>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3">
          <div className="md:col-span-2 p-8 min-h-[420px]">
            {step === 0 && <ServiceStep onPick={(s)=>{setPicked({...picked, service:s}); setStep(1);}} selected={picked.service}/>}
            {step === 1 && <StylistStep onPick={(s)=>{setPicked({...picked, stylist:s}); setStep(2);}} selected={picked.stylist}/>}
            {step === 2 && <DateTimeStep picked={picked} setPicked={setPicked} onNext={()=>setStep(3)}/>}
            {step === 3 && <ConfirmStep picked={picked}/>}
            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <button onClick={()=>setStep(step-1)}
                        className="px-4 py-2 rounded-full text-sm flex items-center gap-2 border"
                        style={{ borderColor: C.linenDk, color: C.inkSoft }}>
                  <ChevronLeft size={14}/> Back
                </button>
              )}
            </div>
          </div>
          <Summary picked={picked}/>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { id:'cut', name:'Cut & Style', duration:'45 min', price:65, desc:'Tailored cut, wash, blow-dry' },
  { id:'color', name:'Colour & Highlights', duration:'2h 30', price:220, desc:'Full colour transformation' },
  { id:'bal', name:'Balayage', duration:'3h', price:290, desc:'Sun-kissed, hand-painted' },
  { id:'blow', name:'Blow Dry', duration:'30 min', price:45, desc:'Polished finish' },
  { id:'treat', name:'Treatment & Mask', duration:'45 min', price:75, desc:'Restorative ritual' },
  { id:'bridal', name:'Bridal Package', duration:'2h', price:250, desc:'Trial + day-of styling' },
];

function ServiceStep({ onPick, selected }) {
  return (
    <div className="fade-up">
      <h3 className="font-display text-2xl mb-1">Choose a service</h3>
      <p className="text-sm mb-6" style={{color: C.muted}}>Six signature services. Same care, every time.</p>
      <div className="grid sm:grid-cols-2 gap-3 stagger">
        {SERVICES.map(s => (
          <button key={s.id} onClick={()=>onPick(s)}
                  className="text-left p-5 rounded-2xl border transition-all hover:shadow-lg"
                  style={{
                    background: selected?.id === s.id ? C.ink : C.cream,
                    color: selected?.id === s.id ? C.cream : C.ink,
                    borderColor: selected?.id === s.id ? C.ink : C.linenDk,
                  }}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display text-lg">{s.name}</div>
                <div className="text-xs mt-0.5 opacity-70">{s.desc}</div>
              </div>
              <div className="text-right num">
                <div className="font-display text-xl">${s.price}</div>
                <div className="text-[10px] opacity-60">{s.duration}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const STYLISTS = [
  { id:'nina', name:'Nina', role:'Senior Stylist', years:9, color: C.bronze },
  { id:'sarah', name:'Sarah', role:'Colour Specialist', years:7, color: C.clay },
  { id:'jess', name:'Jess', role:'Stylist', years:4, color: C.forest },
  { id:'maya', name:'Maya', role:'Junior Stylist', years:2, color: C.sage },
  { id:'any', name:'No preference', role:'Earliest availability', years:0, color: C.gold },
];

function StylistStep({ onPick, selected }) {
  return (
    <div className="fade-up">
      <h3 className="font-display text-2xl mb-1">Pick your stylist</h3>
      <p className="text-sm mb-6" style={{color: C.muted}}>Every team member is hand-picked and continuously trained.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        {STYLISTS.map(s => (
          <button key={s.id} onClick={()=>onPick(s)}
                  className="text-left p-5 rounded-2xl border transition-all hover:shadow-lg"
                  style={{
                    background: selected?.id === s.id ? C.ink : C.cream,
                    color: selected?.id === s.id ? C.cream : C.ink,
                    borderColor: selected?.id === s.id ? C.ink : C.linenDk,
                  }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg mb-3"
                 style={{ background: s.color, color: '#fff' }}>
              {s.name[0]}
            </div>
            <div className="font-display text-lg">{s.name}</div>
            <div className="text-xs opacity-70">{s.role}</div>
            {s.years > 0 && <div className="text-[10px] mt-2 opacity-60 num">{s.years} years experience</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateTimeStep({ picked, setPicked, onNext }) {
  const days = ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 01'];
  const slots = ['9:00', '9:45', '10:30', '11:15', '12:00', '13:30', '14:15', '15:00', '15:45', '16:30'];
  const unavailable = ['11:15', '14:15'];
  return (
    <div className="fade-up">
      <h3 className="font-display text-2xl mb-1">When suits you?</h3>
      <p className="text-sm mb-6" style={{color: C.muted}}>Real-time availability synced across the team.</p>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {days.map(d => (
          <button key={d} onClick={()=>setPicked({...picked, date:d})}
                  className="flex-shrink-0 px-5 py-3 rounded-2xl text-sm border transition-all"
                  style={{
                    background: picked.date === d ? C.ink : C.cream,
                    color: picked.date === d ? C.cream : C.ink,
                    borderColor: picked.date === d ? C.ink : C.linenDk,
                  }}>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">{d.split(' ')[0]}</div>
            <div className="font-display text-xl num">{d.split(' ')[1]}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {slots.map(t => {
          const taken = unavailable.includes(t);
          return (
            <button key={t} disabled={taken}
                    onClick={() => { setPicked({...picked, time:t}); onNext(); }}
                    className="py-3 rounded-xl text-sm num border transition-all"
                    style={{
                      background: picked.time === t ? C.ink : (taken ? 'transparent' : C.cream),
                      color: picked.time === t ? C.cream : (taken ? C.muted : C.ink),
                      borderColor: picked.time === t ? C.ink : C.linenDk,
                      textDecoration: taken ? 'line-through' : 'none',
                      cursor: taken ? 'not-allowed' : 'pointer',
                    }}>
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmStep({ picked }) {
  return (
    <div className="fade-up">
      <h3 className="font-display text-2xl mb-1">Almost there</h3>
      <p className="text-sm mb-6" style={{color: C.muted}}>We'll send confirmations via email, SMS and WhatsApp.</p>
      <div className="space-y-3">
        {['Full name', 'Email', 'Mobile number'].map(p => (
          <input key={p} placeholder={p}
                 className="w-full px-5 py-3.5 rounded-xl border text-sm"
                 style={{ background: C.cream, borderColor: C.linenDk, color: C.ink }}/>
        ))}
        <textarea placeholder="Anything we should know? (allergies, photo of inspiration, etc.)"
                  rows={3}
                  className="w-full px-5 py-3.5 rounded-xl border text-sm"
                  style={{ background: C.cream, borderColor: C.linenDk, color: C.ink }}/>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs" style={{color: C.muted}}>
        <CheckCircle2 size={14} color={C.sage}/> No card needed. 24h cancellation policy.
      </div>
      <button className="mt-6 w-full py-4 rounded-full text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: C.ink, color: C.cream }}>
        Confirm booking · ${picked.service?.price || 0}
        <ArrowRight size={16}/>
      </button>
    </div>
  );
}

function Summary({ picked }) {
  return (
    <div className="p-8 border-l" style={{ background: C.linen, borderColor: C.linenDk }}>
      <div className="text-xs tracking-[0.2em] uppercase mb-4" style={{color: C.muted}}>Your booking</div>
      <div className="space-y-4">
        <Row label="Service" value={picked.service?.name || '—'} sub={picked.service?.duration}/>
        <Row label="Stylist" value={picked.stylist?.name || '—'} sub={picked.stylist?.role}/>
        <Row label="Date" value={picked.date || '—'} sub={picked.time}/>
        <div className="pt-4 border-t" style={{borderColor: C.linenDk}}>
          <div className="flex justify-between items-end">
            <div className="text-xs" style={{color: C.muted}}>Total</div>
            <div className="font-display text-3xl num">${picked.service?.price || 0}</div>
          </div>
          <div className="text-[11px] mt-1" style={{color: C.muted}}>NZD · pay in salon</div>
        </div>
        <div className="pt-4 mt-4 border-t" style={{borderColor: C.linenDk}}>
          <div className="text-xs tracking-[0.2em] uppercase mb-3" style={{color: C.muted}}>Salon</div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={14} className="mt-0.5 flex-shrink-0" color={C.bronze}/>
            <div style={{color: C.inkSoft}}>
              Shop 3.26A, Coast Plaza<br/>
              2 Tindalls Beach Road<br/>
              Whangaparāoa 0930
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({label, value, sub}) {
  return (
    <div className="flex justify-between items-start">
      <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>{label}</div>
      <div className="text-right">
        <div className="text-sm" style={{color: C.ink}}>{value}</div>
        {sub && <div className="text-[11px]" style={{color: C.muted}}>{sub}</div>}
      </div>
    </div>
  );
}

function ServicesShowcase() {
  return (
    <section className="max-w-[1400px] mx-auto px-6 py-16">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Menu</div>
          <h2 className="font-display text-5xl mt-2">Six rituals.</h2>
        </div>
        <button className="text-sm underline" style={{color: C.inkSoft}}>View full price list →</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {SERVICES.slice(0,3).map((s,i) => (
          <div key={s.id} className="rounded-3xl p-7 relative overflow-hidden"
               style={{ background: [C.bronze, C.forest, C.clay][i], color: '#fff', minHeight: 280 }}>
            <div className="absolute inset-0 opacity-20"
                 style={{ backgroundImage: `radial-gradient(circle at ${30+i*20}% ${20+i*30}%, #fff, transparent 50%)` }}/>
            <div className="relative">
              <div className="text-xs tracking-[0.2em] uppercase opacity-70">0{i+1}</div>
              <h3 className="font-display text-3xl mt-4 leading-tight">{s.name}</h3>
              <p className="text-sm mt-2 opacity-80 max-w-xs">{s.desc}</p>
              <div className="absolute bottom-0 right-0 text-right">
                <div className="font-display text-4xl num">${s.price}</div>
                <div className="text-xs opacity-70">{s.duration}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StylistsRow() {
  const team = [
    {
      name:'Nina', role:'Senior Stylist & Salon Manager', years:9,
      color: C.bronze, accent: C.bronzeDk,
      bio:'Trained in Paris and London — Nina specialises in dimensional balayage and lived-in colour that grows out beautifully.',
      specialties:['Balayage','Lived-in Colour','Curtain Bangs'],
      trained:'Toni & Guy London · L\'Oréal Paris',
      ig:'@nina.hairgo · 4.2k', rating:4.9, reviews:128,
      looks:[
        ['linear-gradient(135deg, #B5754A 0%, #8E5836 50%, #5A3D26 100%)'],
        ['linear-gradient(135deg, #C9A961 0%, #B5754A 100%)'],
        ['linear-gradient(160deg, #DDB892 0%, #8E5836 100%)'],
      ],
    },
    {
      name:'Sarah', role:'Colour Specialist', years:7,
      color: C.clay, accent: '#9C4F39',
      bio:'Sarah is our colour wizard — corrective work, vivid fashion shades, and the cleanest blondes on the peninsula.',
      specialties:['Colour Correction','Vivid Fashion','Platinum Blonde'],
      trained:'Vidal Sassoon Sydney · Wella Master Colour',
      ig:'@sarah.colour · 2.8k', rating:5.0, reviews:94,
      looks:[
        ['linear-gradient(135deg, #F5E6D3 0%, #DDB892 50%, #C49B6D 100%)'],
        ['linear-gradient(135deg, #C4684F 0%, #8E2A1F 100%)'],
        ['linear-gradient(135deg, #E8DDD0 0%, #B8A088 100%)'],
      ],
    },
    {
      name:'Jess', role:'Stylist & Bridal Specialist', years:4,
      color: C.forest, accent: '#1F2B1F',
      bio:'Jess turns Pinterest inspiration into reality. From precision cuts to romantic bridal updos, every look is considered.',
      specialties:['Precision Cuts','Bridal Updos','Blow-dry Bar'],
      trained:'Servilles Auckland · Schwarzkopf Academy',
      ig:'@jess.styles · 1.6k', rating:4.9, reviews:67,
      looks:[
        ['linear-gradient(135deg, #2E3A2E 0%, #1A1410 100%)'],
        ['linear-gradient(135deg, #F7F2EB 0%, #EDE4D5 100%)'],
        ['linear-gradient(135deg, #8C9A7E 0%, #4A5A4A 100%)'],
      ],
    },
    {
      name:'Maya', role:'Junior Stylist', years:2,
      color: C.sage, accent: '#6B7A5E',
      bio:'Maya brings fresh creativity and the latest trends. Pop-by for a chat — she\'s the heart of our blow-dry bar.',
      specialties:['Blow Dry','Hot Tools','Waves'],
      trained:'Hair Go in-house apprentice · NZ Hair School',
      ig:'@maya.hair · 890', rating:4.8, reviews:34,
      looks:[
        ['linear-gradient(135deg, #D8A48F 0%, #B5754A 100%)'],
        ['linear-gradient(135deg, #EDE4D5 0%, #C9A961 100%)'],
        ['linear-gradient(135deg, #F7E4D5 0%, #D8A48F 100%)'],
      ],
    },
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-20">
      <div className="flex justify-between items-end mb-12">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>The team</div>
          <h2 className="font-display text-5xl mt-2 leading-none">
            Meet your <em style={{color: C.bronze}}>stylist.</em>
          </h2>
          <p className="text-sm mt-3 max-w-md" style={{color: C.muted}}>
            Hand-picked, continuously trained. Tap any profile to see their portfolio and book directly.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {team.map(s => (
          <div key={s.name}
               className="rounded-3xl overflow-hidden border group transition-all hover:shadow-xl"
               style={{ borderColor: C.linenDk, background: C.paper }}>
            <div className="grid grid-cols-5">
              {/* Avatar area */}
              <div className="col-span-2 relative aspect-[4/5] overflow-hidden"
                   style={{ background: `linear-gradient(180deg, ${s.color}55 0%, ${s.color} 70%, ${s.accent} 100%)` }}>
                <div className="absolute inset-0 opacity-30"
                     style={{ backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), transparent 50%)` }}/>
                <div className="absolute bottom-4 left-4">
                  <div className="font-display text-8xl text-white opacity-90 leading-none">{s.name[0]}</div>
                </div>
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <span className="text-[10px] tracking-wider uppercase text-white opacity-80 px-2 py-0.5 rounded-full"
                        style={{background: 'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)'}}>
                    {s.years} yrs
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-white px-2 py-0.5 rounded-full"
                       style={{background: 'rgba(0,0,0,0.25)', backdropFilter:'blur(8px)'}}>
                    <Star size={9} fill={C.gold} color={C.gold}/>
                    <span className="num">{s.rating}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="col-span-3 p-5 flex flex-col">
                <div className="font-display text-2xl leading-tight">{s.name}</div>
                <div className="text-xs mt-0.5" style={{color: C.muted}}>{s.role}</div>

                <p className="font-display italic text-sm mt-3 leading-snug" style={{color: C.inkSoft}}>
                  &ldquo;{s.bio}&rdquo;
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.specialties.map(sp => (
                    <span key={sp} className="text-[10px] px-2 py-1 rounded-full"
                          style={{ background: C.linen, color: C.inkSoft }}>
                      {sp}
                    </span>
                  ))}
                </div>

                <div className="mt-3 space-y-1 text-[11px]" style={{color: C.muted}}>
                  <div className="flex items-center gap-1.5"><Award size={10}/> {s.trained}</div>
                  <div className="flex items-center gap-1.5"><Instagram size={10}/> {s.ig}</div>
                  <div className="flex items-center gap-1.5"><Star size={10}/> {s.reviews} reviews</div>
                </div>

                {/* Mini portfolio */}
                <div className="mt-auto pt-4 flex gap-1.5">
                  {s.looks.map((look, i) => (
                    <div key={i} className="flex-1 aspect-square rounded-lg"
                         style={{ background: look[0] }}/>
                  ))}
                </div>

                <button className="mt-3 text-xs flex items-center justify-between gap-1 py-2 px-3 rounded-full transition-colors"
                        style={{background: C.ink, color: C.cream}}>
                  Book with {s.name}
                  <ArrowRight size={11}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----- PHOTO GALLERY — Hair · Make-up · Massage · Body
   Galerie de tous les services avec lightbox et booking direct */
function Lookbook() {
  const [filter, setFilter] = useState('All');
  const [openLook, setOpenLook] = useState(null);

  const categories = [
    { id:'All', label:'All looks', icon: Sparkles, count:24 },
    { id:'Hair', label:'Hair styling', icon: Scissors, count:9 },
    { id:'Makeup', label:'Make-up', icon: Heart, count:6 },
    { id:'Massage', label:'Massage', icon: Hand, count:5 },
    { id:'Body', label:'Body & skin', icon: Sparkle, count:4 },
  ];

  const looks = [
    // HAIR
    { id:1, cat:'Hair', name:'Honey Balayage', svc:'Balayage', stylist:'Nina', price:290, duration:'3h',
      desc:'Sun-warmed honey tones, hand-painted for movement and dimension. Low maintenance, grows out beautifully.',
      bg:'linear-gradient(135deg, #C9A961 0%, #B5754A 45%, #8E5836 100%)',
      tint:'radial-gradient(circle at 30% 20%, rgba(255,240,200,0.5), transparent 55%)' },
    { id:2, cat:'Hair', name:'Sun-kissed Beach Waves', svc:'Balayage + Blow-out', stylist:'Nina', price:330, duration:'3h 30',
      desc:'Effortless Bondi-style waves with painted highlights. Beach holiday in a session.',
      bg:'linear-gradient(135deg, #F5E6D3 0%, #DDB892 50%, #B5754A 100%)',
      tint:'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.4), transparent 55%)' },
    { id:3, cat:'Hair', name:'Platinum Pixie', svc:'Cut & Colour', stylist:'Sarah', price:285, duration:'3h 30',
      desc:'Sharp, modern pixie in cool platinum. Edgy yet feminine.',
      bg:'linear-gradient(135deg, #F7F2EB 0%, #E8DDD0 50%, #B8A088 100%)',
      tint:'radial-gradient(circle at 40% 60%, rgba(255,255,255,0.6), transparent 50%)' },
    { id:4, cat:'Hair', name:'Rich Brunette', svc:'Full Colour', stylist:'Sarah', price:220, duration:'2h 30',
      desc:'Deep, glossy chocolate brown with chestnut undertones. Pure luxury.',
      bg:'linear-gradient(135deg, #5A3D26 0%, #3A2818 50%, #1A1410 100%)',
      tint:'radial-gradient(circle at 60% 20%, rgba(200,150,100,0.3), transparent 60%)' },
    { id:5, cat:'Hair', name:'Copper Crown', svc:'Colour & Highlights', stylist:'Sarah', price:220, duration:'2h 30',
      desc:'Vibrant copper with dimensional highlights — bold and unforgettable.',
      bg:'linear-gradient(135deg, #E07B4A 0%, #C4684F 50%, #8E2A1F 100%)',
      tint:'radial-gradient(circle at 30% 30%, rgba(255,200,150,0.4), transparent 55%)' },
    { id:6, cat:'Hair', name:'Rose Gold', svc:'Colour & Highlights', stylist:'Sarah', price:240, duration:'2h 45',
      desc:'Soft, peachy rose gold for warm complexions. A signature Sarah look.',
      bg:'linear-gradient(135deg, #F7E4D5 0%, #D8A48F 50%, #B5754A 100%)',
      tint:'radial-gradient(circle at 50% 40%, rgba(255,220,200,0.5), transparent 55%)' },
    { id:7, cat:'Hair', name:'Bridal Champagne Updo', svc:'Bridal Package', stylist:'Jess', price:250, duration:'2h',
      desc:'Soft, romantic updo with champagne shimmer — trial + day-of styling included.',
      bg:'linear-gradient(135deg, #F7F2EB 0%, #EDE4D5 50%, #C9A961 100%)',
      tint:'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.7), transparent 60%)' },
    { id:8, cat:'Hair', name:'Curtain Bangs Refresh', svc:'Cut & Style', stylist:'Nina', price:65, duration:'45 min',
      desc:'The French-girl bang that frames every face. Soft, face-framing, low-commit.',
      bg:'linear-gradient(135deg, #8E5836 0%, #5A3D26 100%)',
      tint:'radial-gradient(circle at 60% 30%, rgba(220,180,140,0.4), transparent 55%)' },
    { id:9, cat:'Hair', name:'Glass Hair Treatment', svc:'Treatment & Mask', stylist:'Nina', price:75, duration:'45 min',
      desc:'Olaplex + Kérastase ritual for mirror-shine hair. Add to any colour service.',
      bg:'linear-gradient(135deg, #3A322B 0%, #1A1410 100%)',
      tint:'radial-gradient(circle at 50% 20%, rgba(220,200,180,0.5), transparent 50%)' },

    // MAKE-UP
    { id:10, cat:'Makeup', name:'Bridal Glow', svc:'Bridal Make-up', stylist:'Lila', price:185, duration:'1h 30',
      desc:'Luminous, photo-ready bridal look. Lasts all day — trial included.',
      bg:'linear-gradient(135deg, #F7E4D5 0%, #E8C5B0 40%, #D8A48F 100%)',
      tint:'radial-gradient(circle at 50% 30%, rgba(255,240,230,0.6), transparent 55%)' },
    { id:11, cat:'Makeup', name:'Smoky Evening Eye', svc:'Evening Make-up', stylist:'Lila', price:95, duration:'1h',
      desc:'Sultry smoked eye with skin that glows. Perfect for a night out.',
      bg:'linear-gradient(135deg, #3A322B 0%, #1A1410 60%, #5A3D26 100%)',
      tint:'radial-gradient(circle at 40% 35%, rgba(200,160,120,0.4), transparent 50%)' },
    { id:12, cat:'Makeup', name:'Natural Daytime', svc:'Day Make-up', stylist:'Lila', price:75, duration:'45 min',
      desc:'Your skin, but better. Breathable foundation, defined brows, soft cheek.',
      bg:'linear-gradient(135deg, #FBF4E9 0%, #F0DAC0 50%, #D8A48F 100%)',
      tint:'radial-gradient(circle at 50% 40%, rgba(255,250,240,0.7), transparent 55%)' },
    { id:13, cat:'Makeup', name:'Sun-kissed Bronze', svc:'Day Make-up', stylist:'Lila', price:85, duration:'45 min',
      desc:'Bronzed cheekbones, golden lids, soft glossy lip. Coastal energy.',
      bg:'linear-gradient(135deg, #E8B88E 0%, #C9854A 50%, #8E5836 100%)',
      tint:'radial-gradient(circle at 60% 30%, rgba(255,220,180,0.5), transparent 55%)' },
    { id:14, cat:'Makeup', name:'Red Lip Statement', svc:'Evening Make-up', stylist:'Lila', price:95, duration:'1h',
      desc:'Velvet red lip with porcelain skin and feline liner. Pure drama.',
      bg:'linear-gradient(135deg, #8E2A1F 0%, #6B1E2E 50%, #3A0E1A 100%)',
      tint:'radial-gradient(circle at 50% 35%, rgba(255,200,180,0.35), transparent 50%)' },
    { id:15, cat:'Makeup', name:'Soft Pearl Bridesmaid', svc:'Group Make-up', stylist:'Lila', price:150, duration:'1h 15',
      desc:'Cohesive look for the bridal party — booked in groups of 3 or more.',
      bg:'linear-gradient(135deg, #F0E8DC 0%, #DDB892 50%, #B5754A 100%)',
      tint:'radial-gradient(circle at 45% 30%, rgba(255,250,240,0.6), transparent 55%)' },

    // MASSAGE
    { id:16, cat:'Massage', name:'Swedish Relaxation · 60min', svc:'Swedish Massage', stylist:'Mei', price:110, duration:'1h',
      desc:'Long, flowing strokes to release tension. Pure de-stress.',
      bg:'linear-gradient(135deg, #8C9A7E 0%, #6B7A5E 60%, #2E3A2E 100%)',
      tint:'radial-gradient(circle at 30% 30%, rgba(220,230,200,0.5), transparent 60%)' },
    { id:17, cat:'Massage', name:'Deep Tissue · 75min', svc:'Deep Tissue Massage', stylist:'Mei', price:145, duration:'1h 15',
      desc:'Targeted pressure for chronic knots — for athletes and desk warriors.',
      bg:'linear-gradient(135deg, #3A322B 0%, #2E3A2E 100%)',
      tint:'radial-gradient(circle at 50% 30%, rgba(140,154,126,0.4), transparent 55%)' },
    { id:18, cat:'Massage', name:'Hot Stone Ritual · 90min', svc:'Hot Stone Massage', stylist:'Mei', price:175, duration:'1h 30',
      desc:'Warm basalt stones melt deep muscular tension. Profoundly grounding.',
      bg:'linear-gradient(135deg, #C4684F 0%, #8E5836 50%, #3A322B 100%)',
      tint:'radial-gradient(circle at 40% 40%, rgba(255,180,140,0.4), transparent 55%)' },
    { id:19, cat:'Massage', name:'Pregnancy Massage · 60min', svc:'Prenatal Massage', stylist:'Mei', price:120, duration:'1h',
      desc:'Side-lying positioning, gentle pressure. For 2nd & 3rd trimesters.',
      bg:'linear-gradient(135deg, #F7E4D5 0%, #E8C5B0 50%, #D8A48F 100%)',
      tint:'radial-gradient(circle at 50% 35%, rgba(255,240,230,0.6), transparent 55%)' },
    { id:20, cat:'Massage', name:'Couples Retreat · 60min', svc:'Couples Massage', stylist:'Mei + Aroha', price:220, duration:'1h',
      desc:'Side-by-side Swedish massage. Champagne on arrival, robes included.',
      bg:'linear-gradient(135deg, #D8A48F 0%, #B5754A 50%, #6B7A5E 100%)',
      tint:'radial-gradient(circle at 55% 35%, rgba(255,220,200,0.4), transparent 55%)' },

    // BODY
    { id:21, cat:'Body', name:'Coastal Sea Salt Scrub', svc:'Body Exfoliation', stylist:'Aroha', price:135, duration:'1h',
      desc:'NZ-harvested sea salt + Manuka oil. Skin like silk, head to toe.',
      bg:'linear-gradient(135deg, #E8DDD0 0%, #C9A961 50%, #8C9A7E 100%)',
      tint:'radial-gradient(circle at 40% 30%, rgba(255,250,235,0.6), transparent 55%)' },
    { id:22, cat:'Body', name:'Manuka Honey Wrap', svc:'Body Wrap', stylist:'Aroha', price:165, duration:'1h 15',
      desc:'Detoxifying full-body cocoon with Manuka honey + clay. NZ-inspired ritual.',
      bg:'linear-gradient(135deg, #C9A961 0%, #B5754A 50%, #5A3D26 100%)',
      tint:'radial-gradient(circle at 50% 35%, rgba(255,230,180,0.5), transparent 55%)' },
    { id:23, cat:'Body', name:'Hydrating Facial · 60min', svc:'Signature Facial', stylist:'Aroha', price:140, duration:'1h',
      desc:'Triple-cleanse, gentle peel, hyaluronic mask. Dewy, plump, calm.',
      bg:'linear-gradient(135deg, #F7F2EB 0%, #E8DDD0 50%, #D8A48F 100%)',
      tint:'radial-gradient(circle at 50% 30%, rgba(255,255,250,0.7), transparent 60%)' },
    { id:24, cat:'Body', name:'Spa Day · 3 hours', svc:'Half-day Package', stylist:'Mei + Aroha', price:320, duration:'3h',
      desc:'Scrub + massage + facial + glass of bubbles. The full reset.',
      bg:'linear-gradient(135deg, #F0E8DC 0%, #D8A48F 30%, #8C9A7E 70%, #2E3A2E 100%)',
      tint:'radial-gradient(circle at 40% 40%, rgba(255,240,220,0.5), transparent 55%)' },
  ];

  const filtered = filter === 'All' ? looks : looks.filter(l => l.cat === filter);

  return (
    <section className="py-20" style={{background: C.ink, color: C.cream}}>
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex justify-between items-end mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase opacity-60">Gallery</div>
            <h2 className="font-display text-5xl mt-2 leading-none">
              See it. Love it.<br/>
              <em style={{color: C.gold}}>Book it.</em>
            </h2>
            <p className="text-sm mt-3 max-w-md opacity-70">
              Hair, make-up, massage, body care. Every photo links to the exact service — no screenshots needed.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl num">{looks.length}</div>
            <div className="text-[10px] tracking-wider uppercase opacity-60">curated looks · refreshed weekly</div>
          </div>
        </div>

        {/* Category filters with icons */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {categories.map(c => {
            const active = filter === c.id;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs border transition-all"
                      style={{
                        background: active ? C.cream : 'transparent',
                        color: active ? C.ink : C.cream,
                        borderColor: active ? C.cream : 'rgba(247,242,235,0.25)',
                      }}>
                <c.icon size={13}/>
                {c.label}
                <span className="num opacity-60 text-[10px]">{c.count}</span>
              </button>
            );
          })}
        </div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((l, i) => (
            <div key={l.id}
                 onClick={() => setOpenLook(l)}
                 className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl"
                 style={{
                   background: l.bg,
                   aspectRatio: i % 5 === 0 ? '3/4' : (i % 7 === 0 ? '3/4' : '4/5'),
                 }}>
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: l.tint }}/>
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.78) 100%)'
              }}/>

              {/* Top badges */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                <div className="flex gap-1.5">
                  <span className="text-[10px] tracking-wider uppercase px-2 py-1 rounded-full backdrop-blur-md"
                        style={{background: 'rgba(255,255,255,0.15)', color: '#fff'}}>
                    {l.cat}
                  </span>
                </div>
                <button onClick={(e)=>{e.stopPropagation();}}
                        className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md"
                        style={{background: 'rgba(0,0,0,0.25)'}}>
                  <Heart size={12} color="#fff"/>
                </button>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="font-display text-xl leading-tight">{l.name}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="text-[11px] opacity-80">with {l.stylist}</div>
                  <div className="font-display text-base num">${l.price}</div>
                </div>
                <button className="mt-3 w-full text-xs py-2 rounded-full flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{background: C.cream, color: C.ink}}>
                  See details <ArrowRight size={11}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-xs opacity-60">
          {filtered.length} of {looks.length} looks · tap any photo for details and instant booking
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {openLook && (
        <div onClick={()=>setOpenLook(null)}
             className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-up"
             style={{background: 'rgba(10,8,6,0.88)', backdropFilter:'blur(8px)'}}>
          <div onClick={(e)=>e.stopPropagation()}
               className="relative max-w-4xl w-full rounded-3xl overflow-hidden grid md:grid-cols-2"
               style={{background: C.paper, color: C.ink, maxHeight:'90vh'}}>
            {/* Image side */}
            <div className="relative aspect-[4/5] md:aspect-auto overflow-hidden"
                 style={{background: openLook.bg}}>
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: openLook.tint }}/>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-md"
                      style={{background: 'rgba(255,255,255,0.15)', color: '#fff'}}>
                  {openLook.cat}
                </span>
              </div>
            </div>
            {/* Content side */}
            <div className="p-7 overflow-y-auto">
              <button onClick={()=>setOpenLook(null)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{background: C.linen}}>
                <X size={14}/>
              </button>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>{openLook.svc}</div>
              <h3 className="font-display text-3xl mt-1 leading-tight">{openLook.name}</h3>
              <p className="text-sm mt-3" style={{color: C.inkSoft}}>{openLook.desc}</p>

              <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{borderColor: C.linenDk}}>
                <div>
                  <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>Stylist</div>
                  <div className="font-display text-base mt-0.5">{openLook.stylist}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>Duration</div>
                  <div className="font-display text-base mt-0.5">{openLook.duration}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>Price</div>
                  <div className="font-display text-base mt-0.5 num">${openLook.price}</div>
                </div>
              </div>

              <button className="mt-6 w-full py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                      style={{background: C.ink, color: C.cream}}>
                Book this look · ${openLook.price}
                <ArrowRight size={14}/>
              </button>
              <button className="mt-2 w-full py-3 rounded-full text-xs"
                      style={{background: C.linen, color: C.inkSoft}}>
                <Heart size={11} className="inline mr-1.5"/> Save to favourites
              </button>
              <div className="mt-4 text-[10px] text-center" style={{color: C.muted}}>
                Free cancellation up to 24h before · no payment required to book
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Reviews() {
  const reviews = [
    { author:'Emma R.', text:'Nina nailed the balayage I\'ve been dreaming of for two years.', rating:5, when:'2 days ago' },
    { author:'Sophie K.', text:'Best salon on the peninsula. Hands down.', rating:5, when:'1 week ago' },
    { author:'Anita M.', text:'Felt looked-after from the second I walked in. Cup of tea in hand.', rating:5, when:'2 weeks ago' },
  ];
  return (
    <section className="py-16" style={{background: C.ink, color: C.cream}}>
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="text-xs tracking-[0.2em] uppercase opacity-60">Said about us</div>
        <h2 className="font-display text-5xl mt-2 mb-12">Three hundred and twelve <em style={{color: C.gold}}>5-star</em> stories.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r,i) => (
            <div key={i} className="p-7 rounded-3xl border" style={{borderColor: 'rgba(247,242,235,0.15)'}}>
              <div className="flex gap-0.5 mb-4">
                {[...Array(r.rating)].map((_,j)=>(<Star key={j} size={14} fill={C.gold} color={C.gold}/>))}
              </div>
              <p className="font-display text-2xl leading-snug">&ldquo;{r.text}&rdquo;</p>
              <div className="mt-6 text-xs opacity-60">{r.author} · {r.when}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LocationHours() {
  const hours = [
    ['Mon', 'Closed'],['Tue', '9 — 6'],['Wed', '9 — 6'],['Thu', '9 — 8'],
    ['Fri', '9 — 6'],['Sat', '8 — 5'],['Sun', '10 — 3'],
  ];
  return (
    <section className="max-w-[1400px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
      <div className="rounded-3xl p-8" style={{background: C.linen}}>
        <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Find us</div>
        <h3 className="font-display text-3xl mt-2">Coast Plaza, Whangaparāoa</h3>
        <div className="mt-4 text-sm" style={{color: C.inkSoft}}>
          Shop 3.26A, 2 Tindalls Beach Road,<br/>Whangaparāoa 0930, Auckland
        </div>
        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 rounded-full text-sm border" style={{borderColor: C.ink}}>Get directions</button>
          <button className="px-4 py-2 rounded-full text-sm" style={{background: C.ink, color: C.cream}}>Call us</button>
        </div>
      </div>
      <div className="rounded-3xl p-8 border" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Opening hours</div>
        <h3 className="font-display text-3xl mt-2">Seven days a week</h3>
        <div className="mt-6 space-y-2">
          {hours.map(([d,h])=>(
            <div key={d} className="flex justify-between py-1.5 border-b last:border-0" style={{borderColor: C.linenDk}}>
              <span className="text-sm">{d}</span>
              <span className="text-sm num" style={{color: h==='Closed' ? C.muted : C.ink}}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   2. DASHBOARD — Daily ops overview
   ============================================================ */
function Dashboard() {
  const revenueData = [
    {d:'Mon', v:780}, {d:'Tue', v:1240}, {d:'Wed', v:1100}, {d:'Thu', v:1620},
    {d:'Fri', v:1980}, {d:'Sat', v:2410}, {d:'Sun', v:1340},
  ];
  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Today · Tuesday 27 May 2026</div>
          <h1 className="font-display text-4xl mt-2">Good morning, Hazzaa.</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <Filter size={14}/> All stylists
          </button>
          <button className="px-4 py-2 rounded-full text-sm flex items-center gap-2" style={{background: C.ink, color: C.cream}}>
            <Plus size={14}/> New booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        <Kpi icon={DollarSign} label="Revenue today" value="$1,240" delta="+18%" trend="up" hint="vs last Tue"/>
        <Kpi icon={Calendar} label="Bookings today" value="14" delta="+3" trend="up" hint="2 walk-ins"/>
        <Kpi icon={UserPlus} label="New clients (mtd)" value="38" delta="+22%" trend="up" hint="organic +Insta"/>
        <Kpi icon={Repeat} label="Rebook rate" value="71%" delta="-2pt" trend="down" hint="target 75%"/>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="md:col-span-2 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Revenue · last 7 days</div>
              <div className="font-display text-3xl mt-1 num">$10,470</div>
            </div>
            <div className="flex gap-1 p-1 rounded-full text-xs" style={{background: C.linen}}>
              {['7D','30D','90D','YTD'].map((p,i)=>(
                <button key={p} className="px-3 py-1 rounded-full"
                        style={{background: i===0?C.ink:'transparent', color: i===0?C.cream:C.inkSoft}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.bronze} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={C.bronze} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{fill: C.muted, fontSize: 11}}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background: C.ink, border:'none', borderRadius: 8, color: C.cream}}/>
              <Area type="monotone" dataKey="v" stroke={C.bronze} strokeWidth={2} fill="url(#rev)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's agenda */}
        <div className="rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
          <div className="flex justify-between items-center mb-5">
            <div className="text-xs tracking-wider uppercase opacity-60">Next up</div>
            <button className="text-xs opacity-60 hover:opacity-100">See all 14 →</button>
          </div>
          <div className="space-y-4">
            {[
              { t:'10:30', name:'Emma R.', svc:'Balayage', stylist:'Nina', dur:'3h', status:'confirmed'},
              { t:'11:00', name:'Sophie K.', svc:'Cut & Style', stylist:'Jess', dur:'45m', status:'arrived'},
              { t:'13:30', name:'Anita M.', svc:'Colour', stylist:'Sarah', dur:'2h30', status:'confirmed'},
              { t:'15:00', name:'New client', svc:'Blow Dry', stylist:'Maya', dur:'30m', status:'new'},
            ].map((a,i)=>(
              <div key={i} className="flex items-start gap-3">
                <div className="num text-sm w-12 opacity-80">{a.t}</div>
                <div className="w-px self-stretch" style={{background: 'rgba(247,242,235,0.15)'}}/>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{a.name}</span>
                    {a.status==='arrived' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background: C.sage, color: C.ink}}>arrived</span>}
                    {a.status==='new' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background: C.gold, color: C.ink}}>new</span>}
                  </div>
                  <div className="text-xs opacity-60">{a.svc} · {a.stylist} · {a.dur}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel mix */}
        <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>Booking sources · May</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[
                {name:'Website', value:48, c:C.bronze},
                {name:'Walk-in', value:18, c:C.forest},
                {name:'Google', value:14, c:C.gold},
                {name:'Instagram', value:12, c:C.clay},
                {name:'Referral', value:8, c:C.sage},
              ]} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {[C.bronze,C.forest,C.gold,C.clay,C.sage].map((c,i)=>(<Cell key={i} fill={c}/>))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {[['Website',48,C.bronze],['Walk-in',18,C.forest],['Google',14,C.gold],['Instagram',12,C.clay],['Referral',8,C.sage]].map(([n,v,c])=>(
              <div key={n} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:c}}/>{n}</div>
                <span className="num" style={{color: C.muted}}>{v}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="md:col-span-2 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>Pulse</div>
          <div className="space-y-3">
            {[
              {icon: AlertTriangle, color: C.clay, txt:'3 products low on stock — Olaplex No.3, blonde toner, foils.', cta:'Reorder'},
              {icon: Gift, color: C.gold, txt:'12 client birthdays in the next 7 days — auto-coupon ready.', cta:'Review'},
              {icon: Megaphone, color: C.bronze, txt:'"Winter Warm-Up" campaign has 14 confirmed bookings so far.', cta:'See report'},
              {icon: Star, color: C.sage, txt:'5 new 5-star Google reviews this week.', cta:'Share to socials'},
            ].map((a,i)=>(
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl" style={{background: C.linen}}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background: a.color+'25'}}>
                    <a.icon size={16} color={a.color}/>
                  </div>
                  <div className="text-sm">{a.txt}</div>
                </div>
                <button className="text-xs underline" style={{color: C.inkSoft}}>{a.cta} →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({icon: Icon, label, value, delta, trend, hint}) {
  return (
    <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
      <div className="flex justify-between items-start mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background: C.linen}}>
          <Icon size={16} color={C.inkSoft}/>
        </div>
        <div className={`flex items-center gap-1 text-xs num`}
             style={{color: trend==='up' ? C.sage : C.clay}}>
          {trend==='up' ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          {delta}
        </div>
      </div>
      <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>{label}</div>
      <div className="font-display text-3xl mt-1 num">{value}</div>
      {hint && <div className="text-[11px] mt-1" style={{color: C.muted}}>{hint}</div>}
    </div>
  );
}

/* ============================================================
   3. STOCK — Inventory (Phorest / Timely style)
   ============================================================ */
function StockView() {
  const items = [
    { sku:'OLP-N3', name:'Olaplex No.3 Hair Perfector', cat:'Treatment', stock:3, min:8, price:42, supplier:'Olaplex NZ', status:'low'},
    { sku:'KER-EL', name:'Kérastase Elixir Ultime 100ml', cat:'Treatment', stock:14, min:6, price:68, supplier:'L\'Oréal Pro', status:'ok'},
    { sku:'WLA-KP', name:'Wella Koleston Perfect 60g · 7/0', cat:'Colour', stock:22, min:10, price:18.50, supplier:'Wella Pro', status:'ok'},
    { sku:'FOIL-100', name:'Pre-cut foils (100m roll)', cat:'Consumables', stock:1, min:4, price:34, supplier:'Salon Supply Co.', status:'critical'},
    { sku:'TON-BL', name:'Blonde toner Pearl 60ml', cat:'Colour', stock:4, min:6, price:14.90, supplier:'Wella Pro', status:'low'},
    { sku:'GHD-PT', name:'GHD Platinum+ straightener', cat:'Tools', stock:2, min:1, price:395, supplier:'GHD AU/NZ', status:'ok'},
    { sku:'SHA-MO', name:'Moroccanoil Shampoo 250ml', cat:'Retail', stock:19, min:8, price:48, supplier:'Moroccanoil', status:'ok'},
    { sku:'CON-MO', name:'Moroccanoil Conditioner 250ml', cat:'Retail', stock:17, min:8, price:48, supplier:'Moroccanoil', status:'ok'},
    { sku:'SCI-HC', name:'Mizutani 5.5" cutting shears', cat:'Tools', stock:0, min:1, price:780, supplier:'Mizutani JP', status:'critical'},
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Operations</div>
          <h1 className="font-display text-4xl mt-2">Inventory & supplies</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <Truck size={14}/> Suppliers
          </button>
          <button className="px-4 py-2 rounded-full text-sm flex items-center gap-2" style={{background: C.ink, color: C.cream}}>
            <Plus size={14}/> Receive stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StockCard label="Total SKUs" value="184" hint="across 6 categories" icon={Layers} color={C.bronze}/>
        <StockCard label="Stock value" value="$14,820" hint="at cost · NZD" icon={DollarSign} color={C.forest}/>
        <StockCard label="Low / Out" value="3 / 2" hint="needs attention" icon={AlertTriangle} color={C.clay}/>
        <StockCard label="On order" value="$2,340" hint="2 POs pending" icon={Truck} color={C.gold}/>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="p-5 border-b flex items-center gap-3" style={{borderColor: C.linenDk}}>
            <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full" style={{background: C.linen}}>
              <Search size={14} color={C.muted}/>
              <input placeholder="Search SKU, name, supplier…"
                     className="flex-1 bg-transparent text-sm outline-none"/>
            </div>
            <div className="flex gap-1 p-1 rounded-full" style={{background: C.linen}}>
              {['All','Treatment','Colour','Retail','Tools'].map((f,i)=>(
                <button key={f} className="px-3 py-1 rounded-full text-xs"
                        style={{background: i===0?C.ink:'transparent', color: i===0?C.cream:C.inkSoft}}>{f}</button>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] tracking-[0.15em] uppercase" style={{color: C.muted}}>
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-right px-5 py-3 font-medium">In stock</th>
                <th className="text-right px-5 py-3 font-medium">Min</th>
                <th className="text-right px-5 py-3 font-medium">Price</th>
                <th className="text-left px-5 py-3 font-medium">Supplier</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it,i)=>(
                <tr key={it.sku} className="border-t" style={{borderColor: C.linenDk}}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold"
                           style={{background: C.linen, color: C.inkSoft}}>{it.sku.split('-')[0]}</div>
                      <div>
                        <div className="text-sm">{it.name}</div>
                        <div className="text-[10px]" style={{color: C.muted}}>{it.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{color: C.inkSoft}}>{it.cat}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm num font-semibold"
                          style={{color: it.status==='critical' ? C.clay : it.status==='low' ? C.gold : C.ink}}>
                      {it.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs num" style={{color: C.muted}}>{it.min}</td>
                  <td className="px-5 py-3 text-right text-sm num">${it.price.toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs" style={{color: C.inkSoft}}>{it.supplier}</td>
                  <td className="px-5 py-3 text-right">
                    {it.status !== 'ok' ? (
                      <button className="text-xs px-3 py-1.5 rounded-full" style={{background: C.ink, color: C.cream}}>
                        Reorder
                      </button>
                    ) : (
                      <button className="text-xs" style={{color: C.muted}}>—</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
            <div className="flex items-center gap-2 text-xs tracking-wider uppercase opacity-60 mb-4">
              <AlertTriangle size={12}/> Critical
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm">Pre-cut foils — 1 left</div>
                <div className="text-[11px] opacity-60">~2 days at current pace</div>
              </div>
              <div>
                <div className="text-sm">Mizutani shears — out</div>
                <div className="text-[11px] opacity-60">Nina's primary tool</div>
              </div>
            </div>
            <button className="w-full mt-5 py-2.5 rounded-full text-xs"
                    style={{background: C.cream, color: C.ink}}>
              Create combined PO
            </button>
          </div>

          <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>Top retail sellers · 30d</div>
            <div className="space-y-3">
              {[
                ['Moroccanoil Shampoo', 24, 1152],
                ['Olaplex No.3', 18, 756],
                ['Kérastase Elixir', 11, 748],
                ['Moroccanoil Cond.', 9, 432],
              ].map(([n,u,v])=>(
                <div key={n} className="flex justify-between items-center text-xs">
                  <div>
                    <div>{n}</div>
                    <div className="text-[10px]" style={{color: C.muted}}>{u} sold</div>
                  </div>
                  <div className="num font-semibold">${v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StockCard({icon: Icon, label, value, hint, color}) {
  return (
    <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background: color+'20'}}>
          <Icon size={18} color={color}/>
        </div>
        <div className="flex-1">
          <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>{label}</div>
          <div className="font-display text-2xl mt-1 num">{value}</div>
          <div className="text-[11px]" style={{color: C.muted}}>{hint}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   4. MARKETING — Multi-channel campaigns (Phorest / Timely style)
   ============================================================ */
function MarketingView() {
  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Growth</div>
          <h1 className="font-display text-4xl mt-2">Marketing studio</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>Email · SMS · WhatsApp · Facebook · Instagram, from one place.</div>
        </div>
        <button className="px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
                style={{background: C.ink, color: C.cream}}>
          <Plus size={14}/> New campaign
        </button>
      </div>

      {/* Channel performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        <ChannelCard icon={Mail} name="Email" color={C.bronze}
                     metric1={{l:'Sent · 30d', v:'1,247'}} metric2={{l:'Open', v:'38%'}} metric3={{l:'CTR', v:'12%'}}/>
        <ChannelCard icon={MessageSquare} name="SMS" color={C.clay}
                     metric1={{l:'Sent · 30d', v:'432'}} metric2={{l:'Delivered', v:'94%'}} metric3={{l:'CTR', v:'18%'}}/>
        <ChannelCard icon={Phone} name="WhatsApp" color={C.sage}
                     metric1={{l:'Sent · 30d', v:'218'}} metric2={{l:'Read', v:'96%'}} metric3={{l:'Reply', v:'28%'}}/>
        <ChannelCard icon={Facebook} name="Facebook / IG" color={C.forest}
                     metric1={{l:'Reach', v:'14.2k'}} metric2={{l:'Eng.', v:'312'}} metric3={{l:'Bookings', v:'24'}}/>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Active campaigns */}
        <div className="md:col-span-2 rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
            <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Campaigns</div>
            <div className="flex gap-1 p-1 rounded-full text-xs" style={{background: C.linen}}>
              {['Active','Scheduled','Drafts','Archived'].map((f,i)=>(
                <button key={f} className="px-3 py-1 rounded-full"
                        style={{background: i===0?C.ink:'transparent', color: i===0?C.cream:C.inkSoft}}>{f}</button>
              ))}
            </div>
          </div>

          <div className="divide-y" style={{borderColor: C.linenDk}}>
            {[
              {name:'Winter Warm-up Special', ch:['email','sms'], sent:1420, conv:14, status:'Live', color: C.bronze},
              {name:'Birthday Treats (automated)', ch:['email','whatsapp'], sent:38, conv:9, status:'Always on', color: C.gold},
              {name:'Win-back: 6-month lapsed', ch:['email','whatsapp'], sent:214, conv:11, status:'Live', color: C.sage},
              {name:'Mother\'s Day Vouchers', ch:['facebook','email'], sent:'—', conv:'—', status:'Draft', color: C.muted},
            ].map((c,i)=>(
              <div key={i} className="p-5 hover:bg-black/[0.02] cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-1 self-stretch rounded-full" style={{background: c.color}}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-display text-lg">{c.name}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{background: c.status==='Draft'?C.linen:C.ink, color: c.status==='Draft'?C.muted:C.cream}}>
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{color: C.muted}}>
                        <div className="flex items-center gap-1">
                          {c.ch.map(x=>(<ChannelIcon key={x} type={x}/>))}
                        </div>
                        <span>·</span>
                        <span className="num">{c.sent} sent</span>
                        <span>·</span>
                        <span className="num">{c.conv} bookings</span>
                      </div>
                    </div>
                  </div>
                  <MoreHorizontal size={16} color={C.muted}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign builder preview */}
        <div className="rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
          <div className="flex items-center justify-between mb-5">
            <div className="text-xs tracking-wider uppercase opacity-60">Composer</div>
            <Zap size={14} color={C.gold}/>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] tracking-wider uppercase opacity-60 mb-1">Audience</div>
              <div className="px-3 py-2.5 rounded-xl text-sm" style={{background:'rgba(247,242,235,0.08)'}}>
                Lapsed clients · 6+ months · 214 people
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider uppercase opacity-60 mb-1">Channels</div>
              <div className="flex gap-2">
                {[Mail, MessageSquare, Phone, Facebook].map((I,i)=>(
                  <button key={i} className="flex-1 py-2.5 rounded-xl flex items-center justify-center"
                          style={{background: i<2 ? C.gold : 'rgba(247,242,235,0.08)',
                                  color: i<2 ? C.ink : C.cream}}>
                    <I size={14}/>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider uppercase opacity-60 mb-1">Subject line</div>
              <div className="px-3 py-2.5 rounded-xl text-sm" style={{background:'rgba(247,242,235,0.08)'}}>
                We've missed you — here's $20 off
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider uppercase opacity-60 mb-1">Send</div>
              <div className="px-3 py-2.5 rounded-xl text-sm flex items-center justify-between"
                   style={{background:'rgba(247,242,235,0.08)'}}>
                <span>Tomorrow · 10:00 AM</span>
                <ChevronDown size={14}/>
              </div>
            </div>
            <div className="pt-3 border-t" style={{borderColor:'rgba(247,242,235,0.15)'}}>
              <div className="text-[10px] tracking-wider uppercase opacity-60 mb-2">Projected impact</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-display text-xl num">~78</div>
                  <div className="text-[10px] opacity-60">opens</div>
                </div>
                <div>
                  <div className="font-display text-xl num">~14</div>
                  <div className="text-[10px] opacity-60">bookings</div>
                </div>
                <div>
                  <div className="font-display text-xl num" style={{color: C.gold}}>~$2.3k</div>
                  <div className="text-[10px] opacity-60">revenue</div>
                </div>
              </div>
            </div>
            <button className="w-full py-3 rounded-full text-sm" style={{background: C.cream, color: C.ink}}>
              Launch campaign
            </button>
          </div>
        </div>

        {/* Audience segments */}
        <div className="md:col-span-3 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Audience segments</div>
              <div className="font-display text-2xl mt-1">Auto-updated daily</div>
            </div>
            <button className="text-xs underline" style={{color: C.inkSoft}}>+ Create segment</button>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            {[
              {name:'VIP · $1k+ lifetime', count:142, color: C.gold, growth:'+8'},
              {name:'Regulars · monthly visits', count:318, color: C.bronze, growth:'+12'},
              {name:'New · joined this month', count:38, color: C.sage, growth:'+38'},
              {name:'At risk · 4mo no visit', count:84, color: C.clay, growth:'+5'},
              {name:'Lapsed · 6mo+', count:214, color: C.forest, growth:'-3'},
              {name:'Birthday this week', count:12, color: C.rose, growth:'auto'},
              {name:'Loves colour services', count:189, color: C.bronzeDk, growth:'+7'},
              {name:'Walk-ins only', count:46, color: C.muted, growth:'+2'},
            ].map((s,i)=>(
              <div key={i} className="p-4 rounded-2xl border" style={{borderColor: C.linenDk}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-7 h-7 rounded-full" style={{background: s.color}}/>
                  <div className="text-[10px] px-2 py-0.5 rounded-full" style={{background: C.linen, color: C.inkSoft}}>
                    {s.growth}
                  </div>
                </div>
                <div className="text-sm leading-tight">{s.name}</div>
                <div className="font-display text-xl mt-1 num">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChannelCard({icon: Icon, name, color, metric1, metric2, metric3}) {
  return (
    <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{background: color+'20'}}>
          <Icon size={16} color={color}/>
        </div>
        <div className="font-display text-lg">{name}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[metric1, metric2, metric3].map((m,i)=>(
          <div key={i}>
            <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>{m.l}</div>
            <div className="font-display text-xl num mt-0.5">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelIcon({type}) {
  const map = { email: Mail, sms: MessageSquare, whatsapp: Phone, facebook: Facebook, instagram: Instagram };
  const colors = { email: C.bronze, sms: C.clay, whatsapp: C.sage, facebook: C.forest, instagram: C.rose };
  const I = map[type] || Mail;
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background: colors[type]+'25'}}>
      <I size={10} color={colors[type]}/>
    </div>
  );
}

/* ============================================================
   5. CLIENTS — CRM with full profile
   ============================================================ */
function ClientsView() {
  const [selected, setSelected] = useState(0);
  const clients = [
    { name:'Emma Robertson', email:'emma.r@gmail.com', phone:'+64 21 ••• 4421', visits:24, ltv:3210, last:'2 days ago', tag:'VIP', color: C.bronze, fav:'Balayage', stylist:'Nina'},
    { name:'Sophie Karangaroa', email:'sophie.k@xtra.co.nz', phone:'+64 22 ••• 8814', visits:18, ltv:1890, last:'5 days ago', tag:'Regular', color: C.sage, fav:'Cut & Style', stylist:'Jess'},
    { name:'Anita Mehta', email:'anita.mehta@gmail.com', phone:'+64 27 ••• 1207', visits:31, ltv:4620, last:'today', tag:'VIP', color: C.gold, fav:'Colour & Highlights', stylist:'Sarah'},
    { name:'Hannah Wilson', email:'h.wilson@outlook.com', phone:'+64 21 ••• 6633', visits:9, ltv:780, last:'3 weeks ago', tag:'At risk', color: C.clay, fav:'Blow Dry', stylist:'Maya'},
    { name:'Olivia Tane', email:'olivia.tane@hotmail.com', phone:'+64 22 ••• 0091', visits:6, ltv:540, last:'4 months ago', tag:'Lapsed', color: C.forest, fav:'Cut & Style', stylist:'Nina'},
    { name:'Jessica Chen', email:'jess.chen@gmail.com', phone:'+64 21 ••• 7728', visits:14, ltv:1640, last:'1 week ago', tag:'Regular', color: C.rose, fav:'Treatment', stylist:'Sarah'},
  ];
  const c = clients[selected];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Relationships</div>
          <h1 className="font-display text-4xl mt-2">Clients</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>1,842 active · 38 new this month</div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <Filter size={14}/> Segment
          </button>
          <button className="px-4 py-2 rounded-full text-sm flex items-center gap-2" style={{background: C.ink, color: C.cream}}>
            <UserPlus size={14}/> Add client
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Client list */}
        <div className="md:col-span-2 rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="p-4 border-b" style={{borderColor: C.linenDk}}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{background: C.linen}}>
              <Search size={14} color={C.muted}/>
              <input placeholder="Search name, email, phone…"
                     className="flex-1 bg-transparent text-sm outline-none"/>
            </div>
          </div>
          <div className="divide-y" style={{borderColor: C.linenDk}}>
            {clients.map((cl,i)=>(
              <button key={i} onClick={()=>setSelected(i)}
                      className="w-full text-left p-4 flex items-center gap-3 transition-colors"
                      style={{background: selected===i ? C.linen : 'transparent'}}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm"
                     style={{background: cl.color, color:'#fff'}}>
                  {cl.name.split(' ').map(p=>p[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate">{cl.name}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{background: C.linen, color: C.inkSoft}}>{cl.tag}</span>
                  </div>
                  <div className="text-xs" style={{color: C.muted}}>{cl.visits} visits · ${cl.ltv} LTV</div>
                </div>
                <div className="text-[11px]" style={{color: C.muted}}>{cl.last}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Client profile */}
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl"
                     style={{background: c.color, color:'#fff'}}>
                  {c.name.split(' ').map(p=>p[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-3xl">{c.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{background: C.ink, color: C.cream}}>{c.tag}</span>
                  </div>
                  <div className="text-sm mt-1" style={{color: C.muted}}>{c.email} · {c.phone}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-full border" style={{borderColor: C.linenDk}}>
                  <Mail size={14}/>
                </button>
                <button className="p-2 rounded-full border" style={{borderColor: C.linenDk}}>
                  <MessageSquare size={14}/>
                </button>
                <button className="p-2 rounded-full border" style={{borderColor: C.linenDk}}>
                  <Phone size={14}/>
                </button>
                <button className="px-3 py-2 rounded-full text-xs flex items-center gap-1.5"
                        style={{background: C.ink, color: C.cream}}>
                  <Plus size={12}/> Book
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-6">
              <Stat label="Visits" value={c.visits}/>
              <Stat label="LTV" value={`$${c.ltv}`}/>
              <Stat label="Avg ticket" value={`$${Math.round(c.ltv/c.visits)}`}/>
              <Stat label="Last visit" value={c.last}/>
            </div>
          </div>

          {/* Visit history */}
          <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Visit history</div>
              <button className="text-xs underline" style={{color: C.inkSoft}}>Export →</button>
            </div>
            <div className="space-y-3">
              {[
                {d:'27 May 2026', s:'Balayage + tone', st:'Nina', p:290, n:'Loved the warmth — repeat'},
                {d:'12 Apr 2026', s:'Cut & Style', st:'Nina', p:65, n:'Trim only · 2cm'},
                {d:'02 Mar 2026', s:'Colour & Highlights', st:'Sarah', p:220, n:'Allergic to PPD — used alt formula'},
                {d:'18 Jan 2026', s:'Treatment & Mask', st:'Nina', p:75, n:''},
              ].map((v,i)=>(
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl" style={{background: C.linen}}>
                  <div className="text-xs num w-24" style={{color: C.inkSoft}}>{v.d}</div>
                  <div className="flex-1">
                    <div className="text-sm">{v.s}</div>
                    {v.n && <div className="text-[11px]" style={{color: C.muted}}>📝 {v.n}</div>}
                  </div>
                  <div className="text-xs" style={{color: C.muted}}>{v.st}</div>
                  <div className="text-sm num font-semibold">${v.p}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences & loyalty */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
              <div className="text-xs tracking-wider uppercase mb-3" style={{color: C.muted}}>Preferences</div>
              <div className="space-y-2 text-sm">
                <Pref label="Favourite service" value={c.fav}/>
                <Pref label="Usual stylist" value={c.stylist}/>
                <Pref label="Communication" value="WhatsApp"/>
                <Pref label="Marketing opt-in" value="Yes · all channels"/>
              </div>
            </div>
            <div className="rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
              <div className="flex items-center gap-2 text-xs tracking-wider uppercase opacity-60 mb-3">
                <Award size={12} color={C.gold}/> Loyalty
              </div>
              <div className="font-display text-3xl num">280 <span className="text-base opacity-60">points</span></div>
              <div className="text-xs opacity-60 mt-1">120 to next $20 voucher</div>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(247,242,235,0.15)'}}>
                <div className="h-full rounded-full" style={{background: C.gold, width:'70%'}}/>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div>
                  <div className="text-[10px] opacity-60">Referrals</div>
                  <div className="font-display text-xl num">3</div>
                </div>
                <div>
                  <div className="text-[10px] opacity-60">Reviews</div>
                  <div className="font-display text-xl num">2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({label, value}) {
  return (
    <div className="p-4 rounded-2xl" style={{background: C.linen}}>
      <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>{label}</div>
      <div className="font-display text-xl mt-1 num">{value}</div>
    </div>
  );
}

function Pref({label, value}) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0" style={{borderColor: C.linenDk}}>
      <span className="text-xs" style={{color: C.muted}}>{label}</span>
      <span style={{color: C.ink}}>{value}</span>
    </div>
  );
}

/* ============================================================
   6. CALENDAR — Smart scheduling (Fresha / Timely)
   Vue jour avec colonnes par coiffeur + règles dispo + rappels auto
   ============================================================ */
function CalendarView() {
  const [day, setDay] = useState('Tue 27');
  const stylists = [
    { id:'nina', name:'Nina', color: C.bronze, role:'Senior' },
    { id:'sarah', name:'Sarah', color: C.clay, role:'Colour' },
    { id:'jess', name:'Jess', color: C.forest, role:'Stylist' },
    { id:'maya', name:'Maya', color: C.sage, role:'Junior' },
  ];
  const hours = Array.from({length: 11}, (_,i) => 8 + i); // 8AM → 6PM

  // Appointments: {stylist, startHour, durHours, client, service, status, color}
  const appts = [
    { st:'nina', s:9, d:0.75, c:'Emma R.', sv:'Cut & Style', status:'confirmed' },
    { st:'nina', s:10.5, d:3, c:'Anita M.', sv:'Balayage + Tone', status:'confirmed' },
    { st:'nina', s:14.5, d:0.75, c:'Sophie K.', sv:'Trim', status:'arrived' },
    { st:'nina', s:16, d:1.25, c:'Olivia T.', sv:'Treatment', status:'confirmed' },
    { st:'sarah', s:9, d:2.5, c:'Hannah W.', sv:'Full Colour', status:'confirmed' },
    { st:'sarah', s:12, d:1, c:'BREAK', sv:'Lunch', status:'break' },
    { st:'sarah', s:13.5, d:3, c:'Jessica C.', sv:'Balayage', status:'confirmed' },
    { st:'jess', s:9.5, d:0.5, c:'Walk-in', sv:'Blow Dry', status:'new' },
    { st:'jess', s:11, d:0.75, c:'Maria L.', sv:'Cut & Style', status:'confirmed' },
    { st:'jess', s:13, d:0.75, c:'Sophie B.', sv:'Cut & Style', status:'confirmed' },
    { st:'jess', s:15, d:2, c:'Lara T.', sv:'Colour Touch-up', status:'confirmed' },
    { st:'maya', s:10, d:0.5, c:'Ava P.', sv:'Blow Dry', status:'confirmed' },
    { st:'maya', s:11, d:0.75, c:'Free slot', sv:'Available', status:'open' },
    { st:'maya', s:13, d:1, c:'Ruby S.', sv:'Treatment', status:'confirmed' },
    { st:'maya', s:15.5, d:0.5, c:'Ella J.', sv:'Blow Dry', status:'confirmed' },
  ];

  const rowH = 56; // px per hour

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Operations</div>
          <h1 className="font-display text-4xl mt-2">Calendar</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>
            Drag to reschedule · click empty slots to add · reminders sent 24h before.
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 rounded-full text-xs" style={{background: C.linen}}>
            {['Day','Week','Month'].map((v,i)=>(
              <button key={v} className="px-4 py-1.5 rounded-full"
                      style={{background: i===0?C.ink:'transparent', color: i===0?C.cream:C.inkSoft}}>{v}</button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <BellRing size={14}/> Reminders
          </button>
          <button className="px-4 py-2 rounded-full text-sm flex items-center gap-2" style={{background: C.ink, color: C.cream}}>
            <Plus size={14}/> New booking
          </button>
        </div>
      </div>

      {/* Date strip */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <button className="p-2 rounded-full border flex-shrink-0" style={{borderColor: C.linenDk}}>
          <ChevronLeft size={14}/>
        </button>
        {['Mon 26','Tue 27','Wed 28','Thu 29','Fri 30','Sat 31','Sun 01'].map(d=>(
          <button key={d} onClick={()=>setDay(d)}
                  className="flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm border transition-all"
                  style={{
                    background: day===d ? C.ink : C.paper,
                    color: day===d ? C.cream : C.ink,
                    borderColor: day===d ? C.ink : C.linenDk,
                  }}>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">{d.split(' ')[0]}</div>
            <div className="font-display text-lg num">{d.split(' ')[1]}</div>
          </button>
        ))}
        <button className="p-2 rounded-full border flex-shrink-0" style={{borderColor: C.linenDk}}>
          <ChevronRight size={14}/>
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-3 rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
          {/* Stylist header row */}
          <div className="grid border-b" style={{gridTemplateColumns: '60px repeat(4, 1fr)', borderColor: C.linenDk, background: C.linen}}>
            <div className="p-3 text-[10px] tracking-wider uppercase" style={{color: C.muted}}>Time</div>
            {stylists.map(s=>(
              <div key={s.id} className="p-3 border-l" style={{borderColor: C.linenDk}}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                       style={{background: s.color, color:'#fff'}}>{s.name[0]}</div>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[10px]" style={{color: C.muted}}>{s.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid relative" style={{gridTemplateColumns: '60px repeat(4, 1fr)', minHeight: hours.length * rowH}}>
            {/* Time column */}
            <div className="border-r" style={{borderColor: C.linenDk}}>
              {hours.map(h=>(
                <div key={h} className="text-[10px] num pr-2 text-right pt-1 border-b"
                     style={{height: rowH, color: C.muted, borderColor: C.linenDk}}>
                  {h}:00
                </div>
              ))}
            </div>

            {/* Stylist columns */}
            {stylists.map((s,si)=>(
              <div key={s.id} className="relative border-r last:border-r-0" style={{borderColor: C.linenDk}}>
                {/* Hour grid lines */}
                {hours.map((_,i)=>(
                  <div key={i} className="border-b" style={{height: rowH, borderColor: C.linenDk}}/>
                ))}
                {/* Current time indicator (10:24) - only on Nina's col for demo */}
                {si === 0 && (
                  <div className="absolute left-0 right-0 z-20 flex items-center"
                       style={{ top: (10.4-8) * rowH }}>
                    <div className="w-2 h-2 rounded-full -ml-1" style={{background: C.clay}}/>
                    <div className="flex-1 h-px" style={{background: C.clay}}/>
                  </div>
                )}
                {/* Appointments for this stylist */}
                {appts.filter(a=>a.st===s.id).map((a,i)=>{
                  const top = (a.s - 8) * rowH;
                  const height = a.d * rowH - 2;
                  const isBreak = a.status==='break';
                  const isOpen = a.status==='open';
                  const bgMap = { confirmed: s.color, arrived: s.color, new: C.gold, break: C.linenDk, open: 'transparent' };
                  return (
                    <div key={i}
                         className="absolute left-1 right-1 rounded-xl p-2 cursor-pointer overflow-hidden text-xs"
                         style={{
                           top, height,
                           background: isOpen ? 'transparent' : bgMap[a.status],
                           border: isOpen ? `1.5px dashed ${C.linenDk}` : 'none',
                           color: isBreak ? C.inkSoft : (isOpen ? C.muted : '#fff'),
                           opacity: isBreak ? 0.7 : 1,
                         }}>
                      <div className="flex items-start gap-1">
                        {!isOpen && !isBreak && <GripVertical size={10} className="mt-0.5 opacity-60 flex-shrink-0"/>}
                        {isBreak && <Coffee size={10} className="mt-0.5 flex-shrink-0"/>}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{a.c}</div>
                          <div className="opacity-80 truncate" style={{fontSize:'10px'}}>{a.sv}</div>
                          {a.status==='arrived' && (
                            <div className="text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded-full"
                                 style={{background: 'rgba(255,255,255,0.25)'}}>arrived ✓</div>
                          )}
                          {a.status==='new' && (
                            <div className="text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded-full"
                                 style={{background: 'rgba(0,0,0,0.15)'}}>NEW</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right rail: smart features */}
        <div className="space-y-4">
          {/* Today summary */}
          <div className="rounded-3xl p-5" style={{background: C.ink, color: C.cream}}>
            <div className="text-xs tracking-wider uppercase opacity-60 mb-3">Today</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-display text-2xl num">14</div>
                <div className="text-[10px] opacity-60">bookings</div>
              </div>
              <div>
                <div className="font-display text-2xl num">87%</div>
                <div className="text-[10px] opacity-60">utilisation</div>
              </div>
              <div>
                <div className="font-display text-2xl num">3</div>
                <div className="text-[10px] opacity-60">free slots</div>
              </div>
              <div>
                <div className="font-display text-2xl num" style={{color: C.gold}}>$1,940</div>
                <div className="text-[10px] opacity-60">projected</div>
              </div>
            </div>
          </div>

          {/* Smart suggestions */}
          <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-center gap-2 text-xs tracking-wider uppercase mb-3" style={{color: C.muted}}>
              <Sparkles size={12} color={C.bronze}/> Smart suggestions
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-2xl" style={{background: C.linen}}>
                <div className="text-xs">Maya has a 45-min gap at 11:30 — text 3 nearby clients?</div>
                <button className="text-[11px] mt-2 underline" style={{color: C.bronze}}>Auto-fill →</button>
              </div>
              <div className="p-3 rounded-2xl" style={{background: C.linen}}>
                <div className="text-xs">Emma R. hasn't rebooked. Suggest 17 Jun · 10:30 with Nina?</div>
                <button className="text-[11px] mt-2 underline" style={{color: C.bronze}}>Send WhatsApp →</button>
              </div>
              <div className="p-3 rounded-2xl" style={{background: C.linen}}>
                <div className="text-xs">Anita's balayage runs 3h — block 30min buffer after?</div>
                <button className="text-[11px] mt-2 underline" style={{color: C.bronze}}>Add buffer →</button>
              </div>
            </div>
          </div>

          {/* Reminder rules */}
          <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs tracking-wider uppercase" style={{color: C.muted}}>
                <BellRing size={12}/> Reminders · automated
              </div>
              <button className="text-[11px] underline" style={{color: C.inkSoft}}>Edit</button>
            </div>
            <div className="space-y-2">
              {[
                {when:'48h before', ch:'email', txt:'Booking confirmation + add to calendar'},
                {when:'24h before', ch:'sms', txt:'Reminder + reply Y to confirm'},
                {when:'2h before', ch:'whatsapp', txt:'See you soon! Directions inside.'},
                {when:'1h after', ch:'email', txt:'Thanks + review request'},
                {when:'4 weeks after', ch:'whatsapp', txt:'Time to rebook? Pre-fill availability'},
              ].map((r,i)=>(
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <ChannelIcon type={r.ch}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] num" style={{color: C.inkSoft}}>{r.when}</div>
                    <div className="text-xs truncate" style={{color: C.muted}}>{r.txt}</div>
                  </div>
                  <div className="w-7 h-4 rounded-full flex items-center px-0.5" style={{background: C.sage}}>
                    <div className="w-3 h-3 rounded-full bg-white ml-auto"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability rules */}
          <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-center gap-2 text-xs tracking-wider uppercase mb-3" style={{color: C.muted}}>
              <Lock size={12}/> Availability today
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Nina</span><span className="num" style={{color: C.muted}}>9:00 – 17:30</span></div>
              <div className="flex justify-between"><span>Sarah</span><span className="num" style={{color: C.muted}}>9:00 – 17:00 · lunch 12–13</span></div>
              <div className="flex justify-between"><span>Jess</span><span className="num" style={{color: C.muted}}>9:30 – 17:00</span></div>
              <div className="flex justify-between"><span>Maya</span><span className="num" style={{color: C.muted}}>10:00 – 16:00</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   7. POS — Point of sale (Square / Fresha checkout)
   Encaissement services + retail + tip + voucher en un seul écran
   ============================================================ */
function POSView() {
  const [tab, setTab] = useState('services');
  const [cart, setCart] = useState([
    { id:'c1', type:'service', name:'Balayage + Tone', stylist:'Nina', price:290, qty:1 },
    { id:'c2', type:'retail', name:'Olaplex No.3 Hair Perfector', price:42, qty:1 },
    { id:'c3', type:'retail', name:'Moroccanoil Shampoo 250ml', price:48, qty:1 },
  ]);
  const [tipPct, setTipPct] = useState(10);
  const [discount, setDiscount] = useState(0);

  const subtotal = cart.reduce((s,i)=>s + i.price*i.qty, 0);
  const discountAmt = subtotal * (discount/100);
  const afterDisc = subtotal - discountAmt;
  const tip = afterDisc * (tipPct/100);
  const gst = afterDisc * 0.15;
  const total = afterDisc + tip;

  const services = SERVICES;
  const retail = [
    { name:'Olaplex No.3', price:42, stock:3 },
    { name:'Moroccanoil Shampoo', price:48, stock:19 },
    { name:'Moroccanoil Cond.', price:48, stock:17 },
    { name:'Kérastase Elixir', price:68, stock:14 },
    { name:'Hair Go Tote', price:25, stock:42 },
    { name:'Wide-tooth Comb', price:18, stock:28 },
  ];
  const vouchers = [
    { name:'$50 gift voucher', price:50, sub:'No expiry' },
    { name:'$100 gift voucher', price:100, sub:'No expiry' },
    { name:'$200 gift voucher', price:200, sub:'Bonus $20' },
    { name:'Bridal package', price:250, sub:'Trial + day-of' },
  ];

  const addItem = (item, type) => {
    setCart([...cart, { id: Date.now()+'', type, name: item.name, price: item.price, qty: 1, stylist: type==='service' ? 'Nina' : undefined }]);
  };
  const removeItem = (id) => setCart(cart.filter(i=>i.id!==id));

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Operations</div>
          <h1 className="font-display text-4xl mt-2">Checkout</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>Services, retail, vouchers — one register.</div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <Receipt size={14}/> Recent sales
          </button>
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <CalendarDays size={14}/> End of day
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Catalog */}
        <div className="lg:col-span-3 rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="p-4 border-b flex items-center gap-3" style={{borderColor: C.linenDk}}>
            <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full" style={{background: C.linen}}>
              <Search size={14} color={C.muted}/>
              <input placeholder="Search or scan barcode…"
                     className="flex-1 bg-transparent text-sm outline-none"/>
            </div>
            <div className="flex gap-1 p-1 rounded-full text-xs" style={{background: C.linen}}>
              {[
                {id:'services', label:'Services'},
                {id:'retail', label:'Retail'},
                {id:'vouchers', label:'Vouchers'},
              ].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                        className="px-3 py-1.5 rounded-full"
                        style={{background: tab===t.id?C.ink:'transparent', color: tab===t.id?C.cream:C.inkSoft}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tab==='services' && services.map(s=>(
              <button key={s.id} onClick={()=>addItem(s,'service')}
                      className="text-left p-4 rounded-2xl border transition-all hover:shadow-md"
                      style={{borderColor: C.linenDk, background: C.cream}}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                     style={{background: C.bronze+'25'}}>
                  <Scissors size={14} color={C.bronze}/>
                </div>
                <div className="text-sm font-medium leading-tight">{s.name}</div>
                <div className="text-[11px] mt-0.5" style={{color: C.muted}}>{s.duration}</div>
                <div className="font-display text-xl num mt-2">${s.price}</div>
              </button>
            ))}
            {tab==='retail' && retail.map((r,i)=>(
              <button key={i} onClick={()=>addItem(r,'retail')}
                      className="text-left p-4 rounded-2xl border transition-all hover:shadow-md"
                      style={{borderColor: C.linenDk, background: C.cream}}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                     style={{background: C.forest+'25'}}>
                  <ShoppingBag size={14} color={C.forest}/>
                </div>
                <div className="text-sm font-medium leading-tight">{r.name}</div>
                <div className="text-[11px] mt-0.5 num" style={{color: r.stock<5 ? C.clay : C.muted}}>
                  {r.stock} in stock
                </div>
                <div className="font-display text-xl num mt-2">${r.price}</div>
              </button>
            ))}
            {tab==='vouchers' && vouchers.map((v,i)=>(
              <button key={i} onClick={()=>addItem(v,'voucher')}
                      className="text-left p-4 rounded-2xl border transition-all hover:shadow-md"
                      style={{borderColor: C.linenDk, background: C.cream}}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                     style={{background: C.gold+'25'}}>
                  <Gift size={14} color={C.gold}/>
                </div>
                <div className="text-sm font-medium leading-tight">{v.name}</div>
                <div className="text-[11px] mt-0.5" style={{color: C.muted}}>{v.sub}</div>
                <div className="font-display text-xl num mt-2">${v.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart + payment */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client */}
          <div className="rounded-3xl p-5 border flex items-center gap-3" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm"
                 style={{background: C.bronze, color:'#fff'}}>AM</div>
            <div className="flex-1">
              <div className="text-sm font-medium">Anita Mehta</div>
              <div className="text-xs" style={{color: C.muted}}>VIP · 31 visits · 280 loyalty pts</div>
            </div>
            <button className="text-xs underline" style={{color: C.inkSoft}}>Change</button>
          </div>

          {/* Cart */}
          <div className="rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="p-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Cart · {cart.length} items</div>
              <button className="text-xs underline" style={{color: C.inkSoft}} onClick={()=>setCart([])}>Clear</button>
            </div>
            <div className="divide-y" style={{borderColor: C.linenDk}}>
              {cart.length === 0 && (
                <div className="p-8 text-center text-sm" style={{color: C.muted}}>Empty cart — tap any item to add</div>
              )}
              {cart.map(i=>(
                <div key={i.id} className="p-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{background: i.type==='service'?C.bronze+'25':(i.type==='retail'?C.forest+'25':C.gold+'25')}}>
                    {i.type==='service' && <Scissors size={12} color={C.bronze}/>}
                    {i.type==='retail' && <ShoppingBag size={12} color={C.forest}/>}
                    {i.type==='voucher' && <Gift size={12} color={C.gold}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{i.name}</div>
                    {i.stylist && <div className="text-[10px]" style={{color: C.muted}}>with {i.stylist}</div>}
                  </div>
                  <div className="text-sm num font-semibold">${(i.price*i.qty).toFixed(2)}</div>
                  <button onClick={()=>removeItem(i.id)} className="p-1">
                    <X size={12} color={C.muted}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="p-4 border-t space-y-2 text-sm" style={{borderColor: C.linenDk, background: C.linen}}>
              <div className="flex justify-between" style={{color: C.muted}}>
                <span>Subtotal</span><span className="num">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center" style={{color: C.muted}}>
                <span>Discount</span>
                <div className="flex gap-1">
                  {[0,5,10,15].map(p=>(
                    <button key={p} onClick={()=>setDiscount(p)}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{background: discount===p?C.ink:C.paper, color: discount===p?C.cream:C.inkSoft}}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              {discount>0 && (
                <div className="flex justify-between text-xs" style={{color: C.clay}}>
                  <span>− {discount}% off</span><span className="num">−${discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center" style={{color: C.muted}}>
                <span>Tip for {cart.find(i=>i.type==='service')?.stylist || 'team'}</span>
                <div className="flex gap-1">
                  {[0,5,10,15,20].map(p=>(
                    <button key={p} onClick={()=>setTipPct(p)}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{background: tipPct===p?C.ink:C.paper, color: tipPct===p?C.cream:C.inkSoft}}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs" style={{color: C.muted}}>
                <span>GST included (15%)</span><span className="num">${gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t" style={{borderColor: C.linenDk}}>
                <span className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Total NZD</span>
                <span className="font-display text-3xl num">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="text-xs tracking-wider uppercase mb-3" style={{color: C.muted}}>Take payment</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                {icon: CreditCard, label:'Card · tap', color: C.bronze, big:true},
                {icon: Smartphone, label:'Apple / Google Pay', color: C.forest},
                {icon: Banknote, label:'Cash', color: C.sage},
                {icon: Wallet, label:'Voucher', color: C.gold},
              ].map((p,i)=>(
                <button key={i} className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all hover:shadow-md ${p.big?'col-span-2':''}`}
                        style={{background: p.color, color:'#fff'}}>
                  <p.icon size={18}/>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>
            <button className="w-full py-3.5 rounded-full text-sm font-medium"
                    style={{background: C.ink, color: C.cream}}>
              Charge ${total.toFixed(2)} →
            </button>
            <div className="mt-3 flex items-center justify-center gap-3 text-[11px]" style={{color: C.muted}}>
              <span>Receipt:</span>
              <button className="underline">Email</button>
              <button className="underline">SMS</button>
              <button className="underline">Print</button>
              <button className="underline">None</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   8. CONNECT — Unified inbox (Phorest Connect)
   Email · SMS · WhatsApp · FB Messenger · Instagram DM en un endroit
   ============================================================ */
function ConnectView() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState('');

  const conversations = [
    { id:0, name:'Emma Robertson', channel:'whatsapp', last:'Sounds great, see you Saturday! 💛', when:'2m', unread:0,
      tag:'VIP', color: C.bronze, online:true },
    { id:1, name:'Sophie Karangaroa', channel:'instagram', last:'Do you have any Saturday slots?', when:'12m', unread:2,
      tag:'Regular', color: C.sage, online:true },
    { id:2, name:'Hannah Wilson', channel:'sms', last:'Confirmed for 3pm tomorrow ✓', when:'1h', unread:0,
      tag:'At risk', color: C.clay },
    { id:3, name:'Jessica Chen', channel:'email', last:'Thanks for the recommendation — I\'ll bring a photo', when:'3h', unread:0,
      tag:'Regular', color: C.rose },
    { id:4, name:'Olivia Tane', channel:'whatsapp', last:'Hey, it\'s been a while…', when:'5h', unread:1,
      tag:'Lapsed', color: C.forest },
    { id:5, name:'Anita Mehta', channel:'facebook', last:'Loved the result, posted on FB!', when:'yesterday', unread:0,
      tag:'VIP', color: C.gold },
    { id:6, name:'Maria Lopez', channel:'sms', last:'Running 10 min late, sorry', when:'yesterday', unread:0,
      tag:'Regular', color: C.bronze },
    { id:7, name:'Ruby Singh', channel:'instagram', last:'Pricing for balayage please?', when:'2 days', unread:0,
      tag:'New', color: C.clay },
  ];

  const c = conversations[selected];

  const messages = [
    { from:'them', t:'Hi! I wanted to ask about Saturday', time:'10:14 AM' },
    { from:'us', t:'Hey Emma! Saturday we have a couple of slots — 11am or 2:30pm. Both with Nina.', time:'10:18 AM', by:'Nina' },
    { from:'them', t:'2:30 works perfectly. Same balayage refresh as last time?', time:'10:20 AM' },
    { from:'us', t:'Done. I\'ve booked you in. You\'ll get the confirmation in a sec. Want to add an Olaplex treatment? It\'s been 3 months ✨', time:'10:22 AM', by:'Nina' },
    { from:'them', t:'Yes please! And can I bring my sister for a blow dry at the same time?', time:'10:24 AM' },
    { from:'us', t:'Of course! I\'ll add her with Maya at 2:30 too. What\'s her name?', time:'10:26 AM', by:'Nina' },
    { from:'them', t:'Sounds great, see you Saturday! 💛', time:'10:28 AM' },
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Conversations</div>
          <h1 className="font-display text-4xl mt-2">Connect</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>One inbox. Every channel. Live.</div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full text-sm border flex items-center gap-2" style={{borderColor: C.linenDk}}>
            <Filter size={14}/> Filter
          </button>
          <button className="px-4 py-2 rounded-full text-sm flex items-center gap-2" style={{background: C.ink, color: C.cream}}>
            <Plus size={14}/> New conversation
          </button>
        </div>
      </div>

      {/* Channel filter strip */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { id:'all', label:'All', n:8, color: C.ink, active:true },
          { id:'email', label:'Email', n:1, color: C.bronze, icon: Mail },
          { id:'sms', label:'SMS', n:2, color: C.clay, icon: MessageSquare },
          { id:'whatsapp', label:'WhatsApp', n:2, color: C.sage, icon: Phone },
          { id:'instagram', label:'Instagram', n:2, color: C.rose, icon: Instagram },
          { id:'facebook', label:'Facebook', n:1, color: C.forest, icon: Facebook },
        ].map(f=>(
          <button key={f.id}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs border"
                  style={{
                    background: f.active ? C.ink : C.paper,
                    color: f.active ? C.cream : C.inkSoft,
                    borderColor: f.active ? C.ink : C.linenDk,
                  }}>
            {f.icon ? <f.icon size={12}/> : <Inbox size={12}/>}
            {f.label}
            <span className="num text-[10px] opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 h-[640px]">
        {/* Conversation list */}
        <div className="lg:col-span-4 rounded-3xl border overflow-hidden flex flex-col"
             style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="p-3 border-b" style={{borderColor: C.linenDk}}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{background: C.linen}}>
              <Search size={13} color={C.muted}/>
              <input placeholder="Search conversations…" className="flex-1 bg-transparent text-xs outline-none"/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{borderColor: C.linenDk}}>
            {conversations.map((cv,i)=>(
              <button key={cv.id} onClick={()=>setSelected(i)}
                      className="w-full text-left p-3 flex items-start gap-3 transition-colors"
                      style={{background: selected===i ? C.linen : 'transparent'}}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                       style={{background: cv.color, color:'#fff'}}>
                    {cv.name.split(' ').map(p=>p[0]).join('')}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                       style={{background: C.paper}}>
                    <ChannelIcon type={cv.channel}/>
                  </div>
                  {cv.online && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                         style={{background: C.sage, borderColor: C.paper}}/>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{cv.name}</div>
                    <div className="text-[10px] flex-shrink-0" style={{color: C.muted}}>{cv.when}</div>
                  </div>
                  <div className="text-xs truncate mt-0.5"
                       style={{color: cv.unread > 0 ? C.ink : C.muted, fontWeight: cv.unread>0 ? 500 : 400}}>
                    {cv.last}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{background: C.linen, color: C.inkSoft}}>{cv.tag}</span>
                    {cv.unread > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold num"
                            style={{background: C.clay, color:'#fff'}}>{cv.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat thread */}
        <div className="lg:col-span-5 rounded-3xl border overflow-hidden flex flex-col"
             style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="p-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                     style={{background: c.color, color:'#fff'}}>
                  {c.name.split(' ').map(p=>p[0]).join('')}
                </div>
                {c.online && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                       style={{background: C.sage, borderColor: C.paper}}/>
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-[11px] flex items-center gap-1.5" style={{color: C.muted}}>
                  <ChannelIcon type={c.channel}/>
                  via {c.channel} · {c.online ? 'active now' : 'last seen 2h ago'}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="p-2 rounded-full hover:bg-black/5"><Phone size={14}/></button>
              <button className="p-2 rounded-full hover:bg-black/5"><Archive size={14}/></button>
              <button className="p-2 rounded-full hover:bg-black/5"><MoreVertical size={14}/></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{background: C.cream}}>
            <div className="text-center text-[10px] tracking-wider uppercase py-2" style={{color: C.muted}}>
              Today
            </div>
            {messages.map((m,i)=>(
              <div key={i} className={`flex ${m.from==='us'?'justify-end':'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className="px-4 py-2.5 rounded-2xl text-sm leading-snug"
                       style={{
                         background: m.from==='us' ? C.ink : C.paper,
                         color: m.from==='us' ? C.cream : C.ink,
                         borderBottomRightRadius: m.from==='us' ? 4 : 16,
                         borderBottomLeftRadius: m.from==='us' ? 16 : 4,
                       }}>
                    {m.t}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 px-2" style={{
                    justifyContent: m.from==='us' ? 'flex-end' : 'flex-start'
                  }}>
                    <span className="text-[10px]" style={{color: C.muted}}>
                      {m.from==='us' && m.by && <span>{m.by} · </span>}{m.time}
                    </span>
                    {m.from==='us' && <CheckCheck size={11} color={C.sage}/>}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2" style={{color: C.muted}}>
              <div className="flex gap-0.5">
                {[0,1,2].map(i=>(
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
                       style={{background: C.muted, animationDelay: `${i*150}ms`}}/>
                ))}
              </div>
              <span className="text-[10px]">Emma is typing…</span>
            </div>
          </div>

          {/* Quick replies */}
          <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto" style={{borderColor: C.linenDk}}>
            {['👋 Welcome back!', '📅 Send availability', '💰 Send price list', '🎁 Send voucher', '📍 Send directions'].map(q=>(
              <button key={q} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border"
                      style={{borderColor: C.linenDk, color: C.inkSoft}}>
                {q}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 border-t flex items-end gap-2" style={{borderColor: C.linenDk}}>
            <button className="p-2 rounded-full hover:bg-black/5"><Paperclip size={16} color={C.muted}/></button>
            <button className="p-2 rounded-full hover:bg-black/5"><ImageIcon size={16} color={C.muted}/></button>
            <div className="flex-1 px-4 py-2.5 rounded-2xl" style={{background: C.linen}}>
              <input value={draft} onChange={e=>setDraft(e.target.value)}
                     placeholder="Reply via WhatsApp…"
                     className="w-full bg-transparent text-sm outline-none"/>
            </div>
            <button className="p-2 rounded-full hover:bg-black/5"><Smile size={16} color={C.muted}/></button>
            <button className="p-2.5 rounded-full" style={{background: C.ink, color: C.cream}}>
              <Send size={14}/>
            </button>
          </div>
        </div>

        {/* Client context */}
        <div className="lg:col-span-3 rounded-3xl border overflow-y-auto p-5"
             style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex flex-col items-center text-center pb-5 border-b" style={{borderColor: C.linenDk}}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-xl"
                 style={{background: c.color, color:'#fff'}}>
              {c.name.split(' ').map(p=>p[0]).join('')}
            </div>
            <div className="font-display text-xl mt-3">{c.name}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full mt-1"
                  style={{background: C.ink, color: C.cream}}>{c.tag}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-4">
            <button className="flex flex-col items-center gap-1 py-2.5 rounded-2xl" style={{background: C.linen}}>
              <Plus size={14}/>
              <span className="text-[10px]">Book</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2.5 rounded-2xl" style={{background: C.linen}}>
              <Gift size={14}/>
              <span className="text-[10px]">Voucher</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2.5 rounded-2xl" style={{background: C.linen}}>
              <Tag size={14}/>
              <span className="text-[10px]">Note</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="text-[10px] tracking-wider uppercase mb-2" style={{color: C.muted}}>Next appointment</div>
              <div className="p-3 rounded-2xl" style={{background: C.linen}}>
                <div className="font-display text-base">Saturday 31 May · 2:30 PM</div>
                <div className="text-[11px] mt-0.5" style={{color: C.muted}}>Balayage refresh + Olaplex · Nina · 3h</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-wider uppercase mb-2" style={{color: C.muted}}>Key facts</div>
              <div className="space-y-1.5">
                <Pref label="Visits" value="24"/>
                <Pref label="LTV" value="$3,210"/>
                <Pref label="Loyalty" value="280 pts"/>
                <Pref label="Last visit" value="2 days ago"/>
                <Pref label="Stylist" value="Nina"/>
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-wider uppercase mb-2" style={{color: C.muted}}>Recent visits</div>
              <div className="space-y-2">
                {[
                  ['Cut & Style', '12 Apr', 65],
                  ['Balayage', '02 Mar', 290],
                  ['Treatment', '18 Jan', 75],
                ].map(([s,d,p])=>(
                  <div key={d} className="flex justify-between text-[11px]">
                    <span>{s}</span>
                    <span style={{color: C.muted}}>{d} · <span className="num">${p}</span></span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full text-xs underline pt-2 border-t" style={{borderColor: C.linenDk, color: C.inkSoft}}>
              Open full profile →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   9. REWARDS — Loyalty + Subscriptions (Phorest / Boulevard)
   Programme de fidélité + abonnements récurrents
   ============================================================ */
function RewardsView() {
  const [tab, setTab] = useState('loyalty');
  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>Retention</div>
          <h1 className="font-display text-4xl mt-2">Rewards</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>
            Loyalty points + recurring subscriptions. Both fully automated.
          </div>
        </div>
        <div className="flex p-1 rounded-full text-xs" style={{background: C.linen}}>
          <button onClick={()=>setTab('loyalty')}
                  className="px-5 py-2 rounded-full flex items-center gap-2"
                  style={{background: tab==='loyalty'?C.ink:'transparent', color: tab==='loyalty'?C.cream:C.inkSoft}}>
            <Award size={13}/> Loyalty
          </button>
          <button onClick={()=>setTab('subs')}
                  className="px-5 py-2 rounded-full flex items-center gap-2"
                  style={{background: tab==='subs'?C.ink:'transparent', color: tab==='subs'?C.cream:C.inkSoft}}>
            <Repeat size={13}/> Subscriptions
          </button>
        </div>
      </div>

      {tab === 'loyalty' && <LoyaltySection/>}
      {tab === 'subs' && <SubscriptionsSection/>}
    </section>
  );
}

function LoyaltySection() {
  const tiers = [
    { name:'Bronze', range:'0 – 99 pts', members:1124, color: C.bronze, perks:['5% off retail','Birthday surprise'] },
    { name:'Silver', range:'100 – 299 pts', members:486, color: C.muted, perks:['10% off retail','Birthday $20 voucher','Priority booking'] },
    { name:'Gold', range:'300 – 599 pts', members:189, color: C.gold, perks:['15% off retail','Free annual treatment','VIP events'] },
    { name:'Platinum', range:'600+ pts', members:43, color: C.ink, perks:['20% off retail','Monthly free blow-dry','Exclusive previews'] },
  ];

  const earnRules = [
    { trigger:'Every visit', pts:10, icon: Calendar, color: C.bronze },
    { trigger:'Every $1 spent', pts:1, icon: DollarSign, color: C.forest },
    { trigger:'Booking online', pts:5, icon: Globe, color: C.sage },
    { trigger:'Refer a friend', pts:50, icon: UserPlus, color: C.gold },
    { trigger:'Leave a review', pts:20, icon: Star, color: C.clay },
    { trigger:'Birthday month', pts:25, icon: Gift, color: C.rose },
  ];

  const redeemCatalog = [
    { name:'$10 off any service', cost:100, type:'discount' },
    { name:'$20 off any service', cost:200, type:'discount' },
    { name:'Free Olaplex treatment', cost:300, type:'service', value:42 },
    { name:'Free Blow Dry', cost:350, type:'service', value:45 },
    { name:'$50 retail credit', cost:450, type:'retail' },
    { name:'Free Cut & Style', cost:600, type:'service', value:65 },
  ];

  const topMembers = [
    { name:'Anita Mehta', pts:642, tier:'Platinum', visits:31, color: C.ink },
    { name:'Emma Robertson', pts:412, tier:'Gold', visits:24, color: C.bronze },
    { name:'Jessica Chen', pts:298, tier:'Silver', visits:14, color: C.rose },
    { name:'Sophie Karangaroa', pts:264, tier:'Silver', visits:18, color: C.sage },
    { name:'Lara Tane', pts:198, tier:'Silver', visits:11, color: C.clay },
  ];

  const monthlyData = [
    {m:'Jan', earned: 4200, redeemed: 1800},
    {m:'Feb', earned: 4800, redeemed: 2100},
    {m:'Mar', earned: 5200, redeemed: 2400},
    {m:'Apr', earned: 5600, redeemed: 2900},
    {m:'May', earned: 6100, redeemed: 3200},
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        <Kpi icon={Users} label="Loyalty members" value="1,842" delta="+38" trend="up" hint="vs 1,804 last month"/>
        <Kpi icon={Award} label="Points outstanding" value="248,420" delta="+12%" trend="up" hint="≈ $4,968 liability"/>
        <Kpi icon={Repeat} label="Redemption rate" value="52%" delta="+4pt" trend="up" hint="target 50%"/>
        <Kpi icon={TrendingUp} label="Member visit lift" value="+38%" delta="vs non-members" trend="up" hint="2.4 visits/yr extra"/>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tiers visualisation */}
        <div className="md:col-span-2 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Tier ladder</div>
              <div className="font-display text-2xl mt-1">4 levels · 1,842 members</div>
            </div>
            <button className="text-xs underline" style={{color: C.inkSoft}}>Edit tiers</button>
          </div>
          <div className="space-y-3">
            {tiers.map((t,i) => {
              const total = tiers.reduce((s,x)=>s+x.members, 0);
              const pct = (t.members / total) * 100;
              return (
                <div key={t.name} className="p-4 rounded-2xl" style={{background: C.linen}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                           style={{background: t.color, color:'#fff'}}>
                        <Award size={13}/>
                      </div>
                      <div>
                        <div className="font-display text-lg">{t.name}</div>
                        <div className="text-[11px]" style={{color: C.muted}}>{t.range}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl num">{t.members}</div>
                      <div className="text-[10px]" style={{color: C.muted}}>{pct.toFixed(0)}% of base</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{background: C.paper}}>
                    <div className="h-full rounded-full" style={{background: t.color, width: `${pct}%`}}/>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.perks.map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{background: C.paper, color: C.inkSoft}}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earning rules */}
        <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>
            <Zap size={12} color={C.bronze}/> Earn rules · automated
          </div>
          <div className="space-y-3">
            {earnRules.map((r,i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0"
                   style={{borderColor: C.linenDk}}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                     style={{background: r.color+'20'}}>
                  <r.icon size={13} color={r.color}/>
                </div>
                <div className="flex-1">
                  <div className="text-sm">{r.trigger}</div>
                </div>
                <div className="font-display text-lg num" style={{color: r.color}}>+{r.pts}</div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5 border border-dashed"
                  style={{borderColor: C.linenDk, color: C.inkSoft}}>
            <Plus size={12}/> Add custom rule
          </button>
        </div>

        {/* Redemption catalog */}
        <div className="md:col-span-2 rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-xs tracking-wider uppercase opacity-60">Redemption catalog</div>
              <div className="font-display text-2xl mt-1">What members can claim</div>
            </div>
            <button className="text-xs underline opacity-80">+ Add reward</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {redeemCatalog.map((r,i) => (
              <div key={i} className="p-4 rounded-2xl"
                   style={{background: 'rgba(247,242,235,0.06)'}}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{background: r.type==='service' ? C.bronze+'40' : r.type==='retail' ? C.forest+'40' : C.gold+'40'}}>
                    {r.type==='service' && <Scissors size={13}/>}
                    {r.type==='retail' && <ShoppingBag size={13}/>}
                    {r.type==='discount' && <Percent size={13}/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{r.name}</div>
                    {r.value && <div className="text-[11px] opacity-60">retail value ${r.value}</div>}
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-end pt-3 border-t"
                     style={{borderColor: 'rgba(247,242,235,0.1)'}}>
                  <span className="text-[10px] opacity-60">cost</span>
                  <span className="font-display text-xl num" style={{color: C.gold}}>{r.cost} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top members */}
        <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>
            <Star size={12} color={C.gold}/> Top earners · this year
          </div>
          <div className="space-y-3">
            {topMembers.map((m,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-[10px] num w-4" style={{color: C.muted}}>{i+1}</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                     style={{background: m.color, color:'#fff'}}>
                  {m.name.split(' ').map(p=>p[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{m.name}</div>
                  <div className="text-[10px]" style={{color: C.muted}}>{m.tier} · {m.visits} visits</div>
                </div>
                <div className="font-display text-lg num">{m.pts}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="md:col-span-3 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Points flow · last 5 months</div>
              <div className="font-display text-2xl mt-1">Earning vs redemption</div>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:C.bronze}}/>Earned</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:C.clay}}/>Redeemed</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill: C.muted, fontSize: 11}}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background: C.ink, border:'none', borderRadius: 8, color: C.cream}}/>
              <Bar dataKey="earned" fill={C.bronze} radius={[6,6,0,0]} barSize={20}/>
              <Bar dataKey="redeemed" fill={C.clay} radius={[6,6,0,0]} barSize={20}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsSection() {
  const plans = [
    {
      name:'The Refresh',
      tag:'Most popular',
      price:79, frequency:'/month',
      desc:'For the wash-and-go set. Always polished, never planning.',
      benefits:[
        '2 blow-dries per month',
        '10% off all retail',
        'Priority booking window',
        'Roll over 1 unused blow-dry',
      ],
      members:84,
      mrr:6636,
      color: C.bronze,
      featured: false,
    },
    {
      name:'Colour Club',
      tag:'Best value',
      price:189, frequency:'/month',
      desc:'Six-weekly colour service + Olaplex. Saves $54 vs à la carte.',
      benefits:[
        '1 colour service every 6 weeks',
        'Olaplex No.3 included',
        '15% off all retail',
        'Free trim with colour',
      ],
      members:62,
      mrr:11718,
      color: C.clay,
      featured: true,
    },
    {
      name:'Hair Go VIP',
      tag:'Unlimited',
      price:299, frequency:'/month',
      desc:'The works. Unlimited blow-dries, monthly cut, quarterly colour.',
      benefits:[
        'Unlimited blow-dries',
        '1 cut & style/month',
        'Quarterly colour or balayage',
        '20% off all extras + retail',
        'Same-day booking guarantee',
      ],
      members:18,
      mrr:5382,
      color: C.forest,
      featured: false,
    },
    {
      name:'Bridal Glow-up',
      tag:'3-month package',
      price:599, frequency:' total · paid 3× $200',
      desc:'For brides. Trial, day-of styling, and 8-week prep.',
      benefits:[
        'Bridal hair trial',
        'Day-of styling (incl. travel)',
        '2 prep treatments',
        'Bridesmaid 15% discount',
      ],
      members:6,
      mrr:1200,
      color: C.gold,
      featured: false,
    },
  ];

  const totalMRR = plans.reduce((s,p) => s + p.mrr, 0);
  const totalMembers = plans.reduce((s,p) => s + p.members, 0);

  const mrrTrend = [
    {m:'Jan', v: 14200},
    {m:'Feb', v: 17800},
    {m:'Mar', v: 20400},
    {m:'Apr', v: 22600},
    {m:'May', v: 24936},
  ];

  const upcoming = [
    { name:'Emma R.', plan:'Refresh', when:'tomorrow', amount:79, status:'will charge' },
    { name:'Sophie K.', plan:'Refresh', when:'in 2 days', amount:79, status:'will charge' },
    { name:'Anita M.', plan:'VIP', when:'in 3 days', amount:299, status:'will charge' },
    { name:'Hannah W.', plan:'Refresh', when:'in 5 days', amount:79, status:'card expires soon' },
    { name:'Jessica C.', plan:'Colour Club', when:'in 6 days', amount:189, status:'will charge' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        <Kpi icon={Repeat} label="Active subscribers" value={totalMembers.toString()} delta="+12" trend="up" hint="vs last month"/>
        <Kpi icon={DollarSign} label="Monthly recurring" value={`$${totalMRR.toLocaleString()}`} delta="+10%" trend="up" hint="NZD · predictable"/>
        <Kpi icon={TrendingUp} label="Churn rate" value="2.8%" delta="-0.4pt" trend="up" hint="industry avg 5%"/>
        <Kpi icon={Award} label="Avg LTV" value="$2,140" delta="+18%" trend="up" hint="subscribers vs $890 non-sub"/>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(p => (
          <div key={p.name} className="rounded-3xl p-6 border relative overflow-hidden flex flex-col"
               style={{
                 borderColor: p.featured ? p.color : C.linenDk,
                 background: p.featured ? p.color : C.paper,
                 color: p.featured ? '#fff' : C.ink,
               }}>
            {p.featured && (
              <div className="absolute top-0 right-0 px-3 py-1 text-[10px] tracking-wider uppercase"
                   style={{background: C.ink, color: C.cream, borderBottomLeftRadius: 12}}>
                ★ {p.tag}
              </div>
            )}
            {!p.featured && (
              <div className="text-[10px] tracking-wider uppercase mb-3"
                   style={{color: p.color}}>{p.tag}</div>
            )}
            <div className="font-display text-2xl leading-tight">{p.name}</div>
            <div className="text-xs mt-1.5 opacity-80 min-h-[32px]">{p.desc}</div>

            <div className="mt-4 mb-4 pb-4 border-b" style={{borderColor: p.featured ? 'rgba(255,255,255,0.2)' : C.linenDk}}>
              <div className="flex items-end gap-1">
                <span className="font-display text-4xl num">${p.price}</span>
                <span className="text-xs opacity-70 pb-1.5">{p.frequency}</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1">
              {p.benefits.map(b => (
                <li key={b} className="flex items-start gap-2 text-xs">
                  <Check size={12} className="mt-0.5 flex-shrink-0" style={{color: p.featured ? C.gold : p.color}}/>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 pt-4 border-t" style={{borderColor: p.featured ? 'rgba(255,255,255,0.2)' : C.linenDk}}>
              <div className="flex justify-between text-[11px] opacity-70 mb-1">
                <span>Active</span><span>MRR</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="font-display text-xl num">{p.members}</span>
                <span className="font-display text-xl num">${p.mrr.toLocaleString()}</span>
              </div>
            </div>
            <button className="mt-4 py-2.5 rounded-full text-xs flex items-center justify-center gap-1"
                    style={{background: p.featured ? '#fff' : C.ink, color: p.featured ? C.ink : C.cream}}>
              Manage plan <ArrowRight size={11}/>
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* MRR trend */}
        <div className="md:col-span-2 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>MRR growth · last 5 months</div>
              <div className="font-display text-3xl mt-1 num">$24,936</div>
              <div className="text-xs mt-1" style={{color: C.sage}}>↑ +75% YTD · projected $35k by year-end</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrTrend}>
              <defs>
                <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.bronze} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={C.bronze} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill: C.muted, fontSize: 11}}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background: C.ink, border:'none', borderRadius: 8, color: C.cream}}/>
              <Area type="monotone" dataKey="v" stroke={C.bronze} strokeWidth={2.5} fill="url(#mrr)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming charges */}
        <div className="rounded-3xl p-6" style={{background: C.ink, color: C.cream}}>
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase opacity-60 mb-4">
            <CreditCard size={12}/> Upcoming charges
          </div>
          <div className="space-y-3">
            {upcoming.map((u,i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0"
                   style={{borderColor: 'rgba(247,242,235,0.1)'}}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{u.name}</div>
                  <div className="text-[10px] opacity-60">{u.plan} · {u.when}</div>
                  {u.status === 'card expires soon' && (
                    <div className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded-full"
                         style={{background: C.clay, color:'#fff'}}>
                      ⚠ card expires soon
                    </div>
                  )}
                </div>
                <div className="font-display text-base num">${u.amount}</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 rounded-full text-xs"
                  style={{background: 'rgba(247,242,235,0.1)', color: C.cream}}>
            See all 170 subscribers →
          </button>
        </div>

        {/* Benefit usage */}
        <div className="md:col-span-3 rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="text-xs tracking-wider uppercase mb-4" style={{color: C.muted}}>Benefit utilisation · this month</div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name:'Blow-dries claimed', used:142, total:168, plan:'Refresh', color: C.bronze },
              { name:'Colour services', used:48, total:62, plan:'Colour Club', color: C.clay },
              { name:'Cuts (VIP)', used:14, total:18, plan:'Hair Go VIP', color: C.forest },
              { name:'Bridal trials', used:4, total:6, plan:'Bridal', color: C.gold },
            ].map((b,i) => {
              const pct = (b.used / b.total) * 100;
              return (
                <div key={i} className="p-4 rounded-2xl" style={{background: C.linen}}>
                  <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>{b.plan}</div>
                  <div className="text-sm mt-1">{b.name}</div>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="font-display text-2xl num">{b.used}</span>
                    <span className="text-xs pb-1 num" style={{color: C.muted}}>/ {b.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{background: C.paper}}>
                    <div className="h-full rounded-full" style={{background: b.color, width: `${pct}%`}}/>
                  </div>
                  <div className="text-[10px] mt-1 num" style={{color: C.muted}}>{pct.toFixed(0)}% utilised</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   10. ADMIN — Self-hosted server console + user & role mgmt
   (Visible uniquement pour le rôle admin)
   ============================================================ */
function AdminView({ session }) {
  const [tab, setTab] = useState('server');

  return (
    <section className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase" style={{color: C.muted}}>System</div>
          <h1 className="font-display text-4xl mt-2">Admin console</h1>
          <div className="text-sm mt-1" style={{color: C.muted}}>
            Self-hosted infrastructure · users · permissions · audit trail.
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full text-xs"
             style={{background: C.sage+'25', color: C.forest}}>
          <CircleDot size={10} className="animate-pulse"/> All systems operational
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-full text-xs mb-6 inline-flex" style={{background: C.linen}}>
        {[
          {id:'server', label:'Server', icon: Server},
          {id:'users', label:'Users & Roles', icon: Users},
          {id:'access', label:'Access Control', icon: MapPin},
          {id:'security', label:'Security', icon: ShieldCheck},
          {id:'audit', label:'Audit log', icon: FileText},
          {id:'backups', label:'Backups', icon: HardDrive},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-4 py-2 rounded-full flex items-center gap-2"
                  style={{background: tab===t.id?C.ink:'transparent', color: tab===t.id?C.cream:C.inkSoft}}>
            <t.icon size={13}/> {t.label}
          </button>
        ))}
      </div>

      {tab==='server' && <ServerPanel/>}
      {tab==='users' && <UsersPanel/>}
      {tab==='access' && <AccessControlPanel/>}
      {tab==='security' && <SecurityPanel/>}
      {tab==='audit' && <AuditPanel/>}
      {tab==='backups' && <BackupsPanel/>}
    </section>
  );
}

function ServerPanel() {
  const metrics = [
    {l:'PHP workers', v:'4 / 16', sub:'25% used · LiteSpeed', icon: Cpu, color: C.sage},
    {l:'MySQL', v:'182 MB', sub:'2.1 GB cap · MariaDB 10.11', icon: Database, color: C.bronze},
    {l:'Storage', v:'1.4 / ∞ GB', sub:'unlimited disk · o2switch', icon: HardDrive, color: C.forest},
    {l:'Bandwidth', v:'42 GB / mo', sub:'unmetered · LiteSpeed cache', icon: Activity, color: C.gold},
  ];
  const services = [
    {name:'Apache + LiteSpeed', port:'443/80', status:'running', uptime:'365d+', mem:'auto'},
    {name:'PHP 8.3 (Laravel 11)', port:'fpm', status:'running', uptime:'12d', mem:'180 MB'},
    {name:'MariaDB 10.11', port:3306, status:'running', uptime:'365d+', mem:'182 MB'},
    {name:'Redis (sessions + cache)', port:6379, status:'running', uptime:'12d', mem:'24 MB'},
    {name:'Cron · Laravel scheduler', port:'—', status:'running', uptime:'12d', mem:'—'},
    {name:'Pusher (real-time websockets)', port:'TLS', status:'connected', uptime:'12d', mem:'external'},
    {name:'Let\'s Encrypt SSL', port:'—', status:'valid', uptime:'auto-renew', mem:'—'},
  ];
  return (
    <div className="space-y-6">
      {/* Server identity */}
      <div className="rounded-3xl p-6 grid md:grid-cols-3 gap-6 items-center" style={{background: C.ink, color: C.cream}}>
        <div>
          <div className="text-xs tracking-wider uppercase opacity-60 flex items-center gap-1.5">
            <Server size={11}/> Production server · o2switch
          </div>
          <div className="font-display text-3xl mt-1">hairgo.o2switch.net</div>
          <div className="text-xs opacity-70 mt-1">🇫🇷 Datacenter Auvergne · cPanel mutualised</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="opacity-60">Plan</div>
            <div className="mt-1">o2switch unique · €84/yr</div>
          </div>
          <div>
            <div className="opacity-60">Stack</div>
            <div className="mt-1">LAMP + Laravel 11</div>
          </div>
          <div>
            <div className="opacity-60">Uptime</div>
            <div className="mt-1 num">99.99% · 30d</div>
          </div>
          <div>
            <div className="opacity-60">Last deploy</div>
            <div className="mt-1">2 d ago · v1.0.3</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="py-2.5 rounded-full text-xs flex items-center justify-center gap-2"
                  style={{background: C.cream, color: C.ink}}>
            <RefreshCw size={12}/> Deploy via Git
          </button>
          <button className="py-2.5 rounded-full text-xs flex items-center justify-center gap-2"
                  style={{background: 'rgba(247,242,235,0.1)', color: C.cream}}>
            <Settings size={12}/> Open cPanel
          </button>
        </div>
      </div>

      {/* Latency warning for NZ */}
      <div className="rounded-2xl p-4 border flex items-start gap-3"
           style={{borderColor: C.gold+'40', background: C.gold+'10'}}>
        <AlertTriangle size={16} color={C.gold} className="flex-shrink-0 mt-0.5"/>
        <div className="flex-1">
          <div className="text-sm font-medium">Latency note · server in France, salon in NZ</div>
          <div className="text-xs mt-0.5" style={{color: C.inkSoft}}>
            Round-trip ~280ms. Mitigated by LiteSpeed full-page cache + Cloudflare edge (Auckland POP).
            Live booking interactions feel instant. Heavy admin queries cached at the edge.
          </div>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        {metrics.map((m,i) => (
          <div key={i} className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{background: m.color+'20'}}>
                <m.icon size={15} color={m.color}/>
              </div>
              <div className="text-[10px] flex items-center gap-1" style={{color: C.sage}}>
                <CircleDot size={8}/> live
              </div>
            </div>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>{m.l}</div>
            <div className="font-display text-2xl mt-1 num">{m.v}</div>
            <div className="text-[10px]" style={{color: C.muted}}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Services running */}
        <div className="rounded-3xl border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Stack · o2switch hosted</div>
            <button className="text-xs underline" style={{color: C.inkSoft}}>View logs</button>
          </div>
          <div className="divide-y" style={{borderColor: C.linenDk}}>
            {services.map((s,i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{background: C.sage}}/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.name}</div>
                  <div className="text-[10px] num" style={{color: C.muted}}>:{s.port} · {s.uptime} · {s.mem}</div>
                </div>
                <button className="text-[10px] px-2 py-1 rounded-full" style={{background: C.linen, color: C.inkSoft}}>
                  Logs
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Connected devices */}
        <div className="rounded-3xl border" style={{borderColor: C.linenDk, background: C.paper}}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Connected devices · now</div>
            <span className="text-xs num" style={{color: C.muted}}>5 active</span>
          </div>
          <div className="divide-y" style={{borderColor: C.linenDk}}>
            {[
              {icon: Tablet, name:'iPad Pro · Front Desk', user:'Sarah W. (staff)', ip:'27.x.x.x', loc:'Coast Plaza WiFi ✓', verified:true},
              {icon: Tablet, name:'iPad Air · Station 2', user:'Jess T. (staff)', ip:'27.x.x.x', loc:'Coast Plaza WiFi ✓', verified:true},
              {icon: Monitor, name:'iMac · Manager desk', user:'Nina P. (manager)', ip:'27.x.x.x', loc:'Coast Plaza WiFi', verified:true},
              {icon: Laptop, name:'MacBook Pro · Doha', user:'Hazzaa E. (admin) · you', ip:'185.xx.xx.xx', loc:'Qatar · admin-allowed', verified:true},
              {icon: Smartphone, name:'iPhone 15 · Nina mobile', user:'Nina P. (manager)', ip:'27.xx.xx.xx', loc:'4G NZ · manager-allowed', verified:true},
            ].map((d,i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{background: C.linen}}>
                  <d.icon size={14}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm flex items-center gap-2">
                    {d.name}
                    {d.user.includes('you') && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{background: C.gold, color: C.ink}}>YOU</span>
                    )}
                  </div>
                  <div className="text-[10px]" style={{color: C.muted}}>{d.user} · {d.ip} · {d.loc}</div>
                </div>
                <button className="text-[10px] px-2 py-1 rounded-full"
                        style={{background: C.clay+'15', color: C.clay}}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  const users = [
    {name:'Hazzaa El Abed', email:'hazzaa@hairgo.co.nz', role:'admin', last:'now · Doha', method:'Pwd + 2FA', color: C.gold, ic: ShieldAlert, active:true},
    {name:'Nina Papio', email:'nina@hairgo.co.nz', role:'manager', last:'12m ago · salon', method:'Pwd + 2FA', color: C.bronze, ic: ShieldCheck, active:true},
    {name:'Sarah Williams', email:'sarah@hairgo.co.nz', role:'staff', last:'now · iPad Pro', method:'PIN', color: C.sage, ic: Shield, active:true},
    {name:'Jess Tindall', email:'jess@hairgo.co.nz', role:'staff', last:'now · iPad Air', method:'PIN', color: C.sage, ic: Shield, active:true},
    {name:'Maya Heke', email:'maya@hairgo.co.nz', role:'staff', last:'2h ago · iPad Pro', method:'PIN', color: C.sage, ic: Shield, active:true},
    {name:'Ramesh Chindanur', email:'ramesh@kiwica.co.nz', role:'accountant', last:'3 days ago', method:'Pwd + 2FA', color: C.forest, ic: FileText, active:true},
    {name:'Aroha Patel (ex-staff)', email:'aroha@hairgo.co.nz', role:'staff', last:'47 days ago', method:'PIN', color: C.muted, ic: Shield, active:false},
  ];

  const permMatrix = [
    {module:'Site (public)',           admin:'view', manager:'view', staff:'view',  accountant:'view'},
    {module:'Calendar',                admin:'full', manager:'full', staff:'own',   accountant:'view'},
    {module:'POS / Checkout',          admin:'full', manager:'full', staff:'full',  accountant:'view'},
    {module:'Connect (messaging)',     admin:'full', manager:'full', staff:'own',   accountant:'—'},
    {module:'Clients (CRM)',           admin:'full', manager:'full', staff:'view',  accountant:'view'},
    {module:'Rewards & Subscriptions', admin:'full', manager:'edit', staff:'view',  accountant:'view'},
    {module:'Inventory',               admin:'full', manager:'full', staff:'view',  accountant:'view'},
    {module:'Marketing',               admin:'full', manager:'full', staff:'—',     accountant:'—'},
    {module:'Dashboard / Reports',     admin:'full', manager:'full', staff:'—',     accountant:'full'},
    {module:'Refunds & voids',         admin:'full', manager:'pin',  staff:'—',     accountant:'—'},
    {module:'Pricing & discounts',     admin:'full', manager:'edit', staff:'—',     accountant:'—'},
    {module:'Admin console',           admin:'full', manager:'—',    staff:'—',     accountant:'—'},
    {module:'User & permissions',      admin:'full', manager:'—',    staff:'—',     accountant:'—'},
    {module:'Server & backups',        admin:'full', manager:'—',    staff:'—',     accountant:'—'},
  ];

  const PermCell = ({v}) => {
    const map = {
      full:    {bg: C.sage+'25', color: C.forest, label:'Full'},
      edit:    {bg: C.bronze+'25', color: C.bronzeDk, label:'Edit'},
      view:    {bg: C.linen, color: C.inkSoft, label:'View'},
      own:     {bg: C.gold+'25', color: '#7a6018', label:'Own only'},
      pin:     {bg: C.clay+'25', color: C.clay, label:'PIN req'},
      '—':     {bg: 'transparent', color: C.muted, label:'—'},
    };
    const s = map[v] || map['—'];
    return (
      <span className="text-[10px] px-2 py-1 rounded-full inline-block num"
            style={{background: s.bg, color: s.color}}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Users list */}
      <div className="rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
          <div>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Team & access</div>
            <div className="font-display text-xl mt-0.5">7 users · 4 roles</div>
          </div>
          <button className="px-4 py-2 rounded-full text-xs flex items-center gap-2"
                  style={{background: C.ink, color: C.cream}}>
            <UserPlus size={12}/> Invite user
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Auth method</th>
              <th className="text-left px-5 py-3 font-medium">Last seen</th>
              <th className="text-right px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u,i)=>(
              <tr key={i} className="border-t" style={{borderColor: C.linenDk, opacity: u.active ? 1 : 0.5}}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                         style={{background: u.color, color: u.role==='admin'?C.ink:'#fff'}}>
                      {u.name.split(' ').map(p=>p[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div className="text-sm flex items-center gap-2">
                        {u.name}
                        {!u.active && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{background: C.linen, color: C.muted}}>SUSPENDED</span>}
                      </div>
                      <div className="text-[11px]" style={{color: C.muted}}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <u.ic size={12} color={u.color}/>
                    <span className="text-xs capitalize">{u.role}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs" style={{color: C.inkSoft}}>{u.method}</td>
                <td className="px-5 py-3 text-xs" style={{color: C.muted}}>{u.last}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="text-[11px] px-2.5 py-1 rounded-full" style={{background: C.linen, color: C.inkSoft}}>Edit</button>
                    <button className="text-[11px] px-2.5 py-1 rounded-full" style={{background: C.clay+'15', color: C.clay}}>
                      {u.active ? 'Suspend' : 'Reactivate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission matrix */}
      <div className="rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="px-5 py-4 border-b" style={{borderColor: C.linenDk}}>
          <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Permission matrix</div>
          <div className="font-display text-xl mt-0.5">What each role can do</div>
          <div className="text-xs mt-1" style={{color: C.muted}}>
            "Own only" = a stylist sees only their own appointments / messages. "PIN req" = manager must enter PIN to authorise.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-[10px] tracking-wider uppercase" style={{color: C.muted, background: C.linen}}>
                <th className="text-left px-5 py-3 font-medium">Module / action</th>
                <th className="text-center px-3 py-3 font-medium">Admin</th>
                <th className="text-center px-3 py-3 font-medium">Manager</th>
                <th className="text-center px-3 py-3 font-medium">Staff</th>
                <th className="text-center px-3 py-3 font-medium">Accountant</th>
              </tr>
            </thead>
            <tbody>
              {permMatrix.map((row,i)=>(
                <tr key={i} className="border-t" style={{borderColor: C.linenDk}}>
                  <td className="px-5 py-2.5 text-sm">{row.module}</td>
                  <td className="px-3 py-2.5 text-center"><PermCell v={row.admin}/></td>
                  <td className="px-3 py-2.5 text-center"><PermCell v={row.manager}/></td>
                  <td className="px-3 py-2.5 text-center"><PermCell v={row.staff}/></td>
                  <td className="px-3 py-2.5 text-center"><PermCell v={row.accountant}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccessControlPanel() {
  const policies = [
    {
      role: 'Admin (Hazzaa)',
      ic: ShieldAlert, color: C.gold,
      rules: [
        {label:'Allowed from', value:'Anywhere on Earth', icon: Globe, ok:true},
        {label:'Time window', value:'24/7', icon: Clock, ok:true},
        {label:'Auth required', value:'Email + Password + 2FA (TOTP)', icon: Key, ok:true},
        {label:'IP whitelist', value:'None (any IP)', icon: WifiOff, ok:true},
      ],
    },
    {
      role: 'Manager (Nina)',
      ic: ShieldCheck, color: C.bronze,
      rules: [
        {label:'Allowed from', value:'Anywhere (mobile + salon)', icon: Globe, ok:true},
        {label:'Time window', value:'24/7', icon: Clock, ok:true},
        {label:'Auth required', value:'Email + Password + 2FA (SMS/WhatsApp)', icon: Key, ok:true},
        {label:'IP whitelist', value:'None (any IP)', icon: WifiOff, ok:true},
      ],
    },
    {
      role: 'Staff (Sarah, Jess, Maya)',
      ic: Shield, color: C.sage,
      featured: true,
      rules: [
        {label:'Allowed from', value:'Coast Plaza ONLY · 27.x.x.x', icon: MapPin, ok:true, strict:true},
        {label:'WiFi SSID required', value:'HairGo-Pro (BSSID: aa:bb:cc:dd:ee:ff)', icon: Wifi, ok:true, strict:true},
        {label:'Devices allowed', value:'3 registered iPads only', icon: Tablet, ok:true, strict:true},
        {label:'Time window', value:'Tue–Sun · 08:00 – 19:00 NZ', icon: Clock, ok:true, strict:true},
        {label:'Auth method', value:'4-digit PIN on tablet', icon: Key, ok:true},
        {label:'Off-site fallback', value:'BLOCKED — must contact manager', icon: Lock, ok:true, strict:true},
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero card explaining the staff restriction */}
      <div className="rounded-3xl p-7 grid md:grid-cols-5 gap-6 items-center" style={{background: C.forest, color: '#fff'}}>
        <div className="md:col-span-4">
          <div className="text-xs tracking-wider uppercase opacity-70 flex items-center gap-2">
            <MapPin size={11}/> Geo-fenced access policy · enforced
          </div>
          <div className="font-display text-3xl mt-2 leading-tight">
            Staff can <em style={{color: C.gold}}>only</em> sign in from inside the salon.
          </div>
          <div className="text-sm opacity-85 mt-2 max-w-2xl">
            Four overlapping checks (IP, WiFi BSSID, device UUID, business hours) block staff login from anywhere
            outside Coast Plaza — even with a valid PIN. Manager and Admin remain unrestricted.
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-6xl num">4</div>
          <div className="text-xs opacity-70 mt-1">enforcement layers</div>
        </div>
      </div>

      {/* Salon network identity (the source of truth) */}
      <div className="rounded-3xl p-6 border" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Salon network · trust anchor</div>
            <div className="font-display text-2xl mt-0.5">Coast Plaza, Whangaparāoa</div>
          </div>
          <button className="px-3 py-1.5 rounded-full text-xs border" style={{borderColor: C.linenDk}}>
            <Edit size={11} className="inline mr-1"/> Update
          </button>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            {l:'Public IPv4', v:'27.x.x.x', sub:'Static · Spark Business', icon: Globe},
            {l:'IPv6 prefix', v:'2407:7000::/64', sub:'Dual-stack ready', icon: Globe},
            {l:'WiFi BSSID', v:'aa:bb:cc:dd:ee:ff', sub:'SSID: HairGo-Pro', icon: Wifi},
            {l:'GPS centroid', v:'-36.622, 174.738', sub:'±50m geofence radius', icon: MapPin},
          ].map((x,i)=>(
            <div key={i} className="p-4 rounded-2xl" style={{background: C.linen}}>
              <div className="flex items-center gap-2 mb-1">
                <x.icon size={11} color={C.muted}/>
                <div className="text-[10px] tracking-wider uppercase" style={{color: C.muted}}>{x.l}</div>
              </div>
              <div className="font-display text-base num">{x.v}</div>
              <div className="text-[10px]" style={{color: C.muted}}>{x.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy per role */}
      <div className="space-y-4">
        {policies.map((p,i) => (
          <div key={i} className="rounded-3xl border overflow-hidden"
               style={{
                 borderColor: p.featured ? p.color : C.linenDk,
                 background: p.featured ? p.color+'08' : C.paper,
                 borderWidth: p.featured ? 2 : 1,
               }}>
            <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
                 style={{borderColor: C.linenDk, background: p.featured ? p.color+'15' : C.linen}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                     style={{background: p.color, color: p.color===C.gold?C.ink:'#fff'}}>
                  <p.ic size={16}/>
                </div>
                <div>
                  <div className="font-display text-lg">{p.role}</div>
                  <div className="text-[11px]" style={{color: C.muted}}>
                    {p.featured ? 'Strictest policy · enforced server-side at every request' : 'Standard policy'}
                  </div>
                </div>
              </div>
              {p.featured && (
                <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                      style={{background: p.color, color:'#fff'}}>
                  <Lock size={10}/> On-site only
                </span>
              )}
            </div>
            <div className="divide-y" style={{borderColor: C.linenDk}}>
              {p.rules.map((r,j) => (
                <div key={j} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{background: r.strict ? p.color+'25' : C.linen}}>
                    <r.icon size={13} color={r.strict ? p.color : C.muted}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] tracking-wider uppercase" style={{color: C.muted}}>{r.label}</div>
                    <div className="text-sm">{r.value}</div>
                  </div>
                  {r.strict && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{background: C.clay+'15', color: C.clay}}>
                      STRICT
                    </span>
                  )}
                  <Check size={14} color={C.sage}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Registered iPads */}
      <div className="rounded-3xl border" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor: C.linenDk}}>
          <div>
            <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Registered staff devices</div>
            <div className="font-display text-lg mt-0.5">3 iPads · only these can show the PIN keypad</div>
          </div>
          <button className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5"
                  style={{background: C.ink, color: C.cream}}>
            <Plus size={11}/> Register iPad
          </button>
        </div>
        <div className="divide-y" style={{borderColor: C.linenDk}}>
          {[
            {name:'iPad Pro 11" · Front Desk', uuid:'F4A2-9B11-...', os:'iPadOS 17.4', certExpiry:'12 Mar 2027', lastSeen:'now', status:'active'},
            {name:'iPad Air 5 · Station 2', uuid:'B8C3-7E04-...', os:'iPadOS 17.4', certExpiry:'14 Apr 2027', lastSeen:'now', status:'active'},
            {name:'iPad Pro 11" · Station 3', uuid:'D2A9-3F18-...', os:'iPadOS 17.5', certExpiry:'22 May 2027', lastSeen:'1h ago', status:'active'},
          ].map((d,i)=>(
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background: C.linen}}>
                <Tablet size={14}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{d.name}</div>
                <div className="text-[10px] num" style={{color: C.muted}}>
                  UUID {d.uuid} · {d.os} · cert valid until {d.certExpiry}
                </div>
              </div>
              <div className="text-[10px]" style={{color: C.muted}}>{d.lastSeen}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{background: C.sage+'25', color: C.forest}}>✓ trusted</span>
              <button className="text-[10px] px-2 py-1 rounded-full"
                      style={{background: C.clay+'15', color: C.clay}}>Revoke</button>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked login attempts */}
      <div className="rounded-3xl border" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="px-5 py-4 border-b" style={{borderColor: C.linenDk}}>
          <div className="text-xs tracking-wider uppercase" style={{color: C.muted}}>Blocked attempts · last 7 days</div>
          <div className="font-display text-lg mt-0.5">4 blocks · system working as designed</div>
        </div>
        <div className="divide-y" style={{borderColor: C.linenDk}}>
          {[
            {when:'Yesterday 22:14', who:'Sarah W. (staff PIN)', from:'27.xx.xx.xx · Mobile 4G', reason:'Off-site IP · staff PIN attempted outside Coast Plaza network', action:'Blocked + SMS alert to Nina'},
            {when:'Mon 19:32', who:'Maya H. (staff PIN)', from:'27.xx.xx.xx · home WiFi', reason:'Outside business hours (after 19:00 NZ)', action:'Blocked'},
            {when:'Sun 14:08', who:'Unknown device', from:'185.x.x.x · Russia', reason:'Unregistered device tried staff endpoint', action:'IP banned 24h + email alert'},
            {when:'Sun 09:15', who:'Jess T. (staff PIN)', from:'27.xx.xx.xx · café WiFi', reason:'WiFi BSSID mismatch (not HairGo-Pro)', action:'Blocked'},
          ].map((b,i)=>(
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{background: C.clay+'20'}}>
                <ShieldAlert size={13} color={C.clay}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span>{b.who}</span>
                  <span style={{color: C.muted}}>·</span>
                  <span className="text-xs num" style={{color: C.muted}}>{b.from}</span>
                </div>
                <div className="text-xs mt-0.5" style={{color: C.inkSoft}}>{b.reason}</div>
                <div className="text-[10px] mt-0.5" style={{color: C.muted}}>→ {b.action}</div>
              </div>
              <div className="text-[10px] num" style={{color: C.muted}}>{b.when}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const checks = [
    {label:'HTTPS / TLS 1.3 enforced', status:'pass', detail:'Auto-renew via Let\'s Encrypt (o2switch) · A+ on SSL Labs'},
    {label:'Database encryption at rest', status:'pass', detail:'MariaDB · column-level AES for PII (clients, payments)'},
    {label:'Daily encrypted backups', status:'pass', detail:'cPanel JetBackup + offsite to Wasabi · 3 destinations'},
    {label:'Two-factor authentication', status:'pass', detail:'Admin + Manager · TOTP via Google Authenticator + SMS fallback'},
    {label:'Staff geo-fencing', status:'pass', detail:'IP + WiFi BSSID + device UUID + business hours · 4 blocks last week'},
    {label:'Session timeout', status:'pass', detail:'Admin 30min · Manager 2h · Staff 8h shift (auto-logout at close)'},
    {label:'WAF & rate limiting', status:'pass', detail:'Cloudflare proxy · 100 req/min · OWASP rules enabled'},
    {label:'Failed login lockout', status:'pass', detail:'5 attempts = 15min lock + email alert to Hazzaa'},
    {label:'OS security patches', status:'warn', detail:'o2switch-managed · auto-applied weekly Sunday'},
    {label:'Password policy', status:'pass', detail:'14+ chars · rotated every 90 days · bcrypt hashed'},
    {label:'Privacy Act 2020 (NZ) compliance', status:'pass', detail:'Data hosted EU · adequate jurisdiction · DPO Hazzaa'},
    {label:'PCI-DSS scope', status:'pass', detail:'Out of scope · Stripe NZ tokenisation (no card data stored)'},
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 grid md:grid-cols-4 gap-6 items-center" style={{background: C.forest, color: '#fff'}}>
        <div className="md:col-span-3">
          <div className="text-xs tracking-wider uppercase opacity-70">Security posture</div>
          <div className="font-display text-3xl mt-1">11 of 12 checks passing</div>
          <div className="text-sm opacity-80 mt-1">1 informational warning · no critical issues.</div>
        </div>
        <div className="text-center">
          <div className="font-display text-6xl num">A+</div>
          <div className="text-xs opacity-70 mt-1">Overall grade</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {checks.map((c,i)=>(
          <div key={i} className="rounded-2xl p-4 border flex items-start gap-3"
               style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{background: c.status==='pass' ? C.sage+'25' : C.gold+'25'}}>
              {c.status==='pass'
                ? <Check size={14} color={C.forest}/>
                : <AlertTriangle size={14} color={C.gold}/>}
            </div>
            <div className="flex-1">
              <div className="text-sm">{c.label}</div>
              <div className="text-[11px] mt-0.5" style={{color: C.muted}}>{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditPanel() {
  const events = [
    {when:'10:24', who:'Hazzaa E.', role:'admin', action:'Logged in from Doha (185.x.x.x) · MacBook · VPN', sev:'info'},
    {when:'10:22', who:'Nina P.', role:'manager', action:'Applied 10% discount to Anita M. ticket #4821', sev:'info'},
    {when:'10:18', who:'Sarah W.', role:'staff', action:'Checked in Sophie K. (12:00 cut & style)', sev:'info'},
    {when:'10:15', who:'system', role:'cron', action:'Sent 24h SMS reminder to 14 clients · 14 delivered', sev:'info'},
    {when:'09:58', who:'Nina P.', role:'manager', action:'Refund $65 issued for booking #4815 · PIN verified', sev:'warn'},
    {when:'09:42', who:'Sarah W.', role:'staff', action:'Tried to access Marketing module · DENIED (no permission)', sev:'warn'},
    {when:'09:15', who:'system', role:'cron', action:'Daily backup completed (1.2 GB → 3 destinations) · 4m 18s', sev:'info'},
    {when:'08:50', who:'Maya H.', role:'staff', action:'Logged in via PIN on iPad Pro (Front Desk)', sev:'info'},
    {when:'02:14', who:'system', role:'auto', action:'PostgreSQL backup encrypted & uploaded to Wasabi NZ + Hetzner DE', sev:'info'},
    {when:'yesterday 18:30', who:'Hazzaa E.', role:'admin', action:'Updated permission: Manager can now PIN-approve refunds up to $200', sev:'crit'},
    {when:'yesterday 11:05', who:'unknown', role:'—', action:'Failed login attempts (5) from 81.x.x.x · IP blocked 15min · email alert sent', sev:'crit'},
  ];

  const sevColor = {
    info: {bg: C.linen, color: C.inkSoft, label:'Info'},
    warn: {bg: C.gold+'25', color: '#7a6018', label:'Warn'},
    crit: {bg: C.clay+'25', color: C.clay, label:'Critical'},
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs" style={{color: C.muted}}>
          Tamper-proof log · every action timestamped & signed · 90 days retention · export to CSV/PDF
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-full text-xs border" style={{borderColor: C.linenDk}}>Filter</button>
          <button className="px-3 py-1.5 rounded-full text-xs border" style={{borderColor: C.linenDk}}>Export</button>
        </div>
      </div>
      <div className="rounded-3xl border overflow-hidden" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="divide-y" style={{borderColor: C.linenDk}}>
          {events.map((e,i)=>{
            const s = sevColor[e.sev];
            return (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="text-[11px] num w-28" style={{color: C.muted}}>{e.when}</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{background: s.bg, color: s.color}}>{s.label}</span>
                <div className="text-xs w-32 flex-shrink-0">
                  <div>{e.who}</div>
                  <div className="text-[10px]" style={{color: C.muted}}>{e.role}</div>
                </div>
                <div className="text-sm flex-1">{e.action}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BackupsPanel() {
  const dests = [
    {name:'o2switch JetBackup', loc:'Auvergne · same datacenter', last:'02:14 today', size:'1.2 GB', status:'ok', icon: HardDrive, color: C.bronze},
    {name:'Wasabi S3 · EU', loc:'Amsterdam · primary offsite', last:'02:18 today', size:'1.2 GB', status:'ok', icon: Cloud, color: C.forest},
    {name:'Backblaze B2 · US-West', loc:'Sacramento · geo-redundancy', last:'02:32 today', size:'1.2 GB', status:'ok', icon: Cloud, color: C.sage},
    {name:'External SSD · Salon', loc:'Coast Plaza · weekly air-gap', last:'Sunday 03:00', size:'5.4 GB (snap)', status:'scheduled', icon: HardDrive, color: C.gold},
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 grid md:grid-cols-4 gap-6 items-center" style={{background: C.ink, color: C.cream}}>
        <div className="md:col-span-3">
          <div className="text-xs tracking-wider uppercase opacity-60">3-2-1 backup strategy</div>
          <div className="font-display text-3xl mt-1">All 4 destinations in sync</div>
          <div className="text-sm opacity-80 mt-1">3 copies · 2 media types · 1 offsite. RPO 24h, RTO 2h.</div>
        </div>
        <button className="py-3 rounded-full text-xs flex items-center justify-center gap-2"
                style={{background: C.gold, color: C.ink}}>
          <RefreshCw size={12}/> Run backup now
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {dests.map((d,i)=>(
          <div key={i} className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                   style={{background: d.color+'20'}}>
                <d.icon size={18} color={d.color}/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-display text-lg">{d.name}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{background: d.status==='ok' ? C.sage+'25' : C.gold+'25',
                                color:    d.status==='ok' ? C.forest    : '#7a6018'}}>
                    {d.status === 'ok' ? '✓ healthy' : 'scheduled'}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{color: C.muted}}>{d.loc}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px]" style={{color: C.muted}}>Last backup</div>
                    <div className="num">{d.last}</div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{color: C.muted}}>Size</div>
                    <div className="num">{d.size}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="text-[11px] px-2.5 py-1 rounded-full" style={{background: C.linen, color: C.inkSoft}}>
                    Test restore
                  </button>
                  <button className="text-[11px] px-2.5 py-1 rounded-full" style={{background: C.linen, color: C.inkSoft}}>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl p-5 border" style={{borderColor: C.linenDk, background: C.paper}}>
        <div className="text-xs tracking-wider uppercase mb-3" style={{color: C.muted}}>Retention policy</div>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div><div className="font-display text-xl num">7</div><div className="text-xs" style={{color: C.muted}}>daily backups kept</div></div>
          <div><div className="font-display text-xl num">4</div><div className="text-xs" style={{color: C.muted}}>weekly snapshots</div></div>
          <div><div className="font-display text-xl num">12</div><div className="text-xs" style={{color: C.muted}}>monthly archives</div></div>
          <div><div className="font-display text-xl num">7 yrs</div><div className="text-xs" style={{color: C.muted}}>tax records (IRD)</div></div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- FOOTER ----------------- */
function Footer() {
  return (
    <footer className="mt-16 py-10 border-t" style={{borderColor: C.linenDk}}>
      <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs"
           style={{color: C.muted}}>
        <div className="flex items-center gap-2">
          <Scissors size={12}/> Hair Go · operated by HEA Holdings Limited (NZBN 9423029)
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><Server size={11}/> Hosted on o2switch (FR)</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={11}/> Privacy Act 2020</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><Lock size={11}/> TLS 1.3</span>
          <span>·</span>
          <span>v 1.0.3</span>
        </div>
      </div>
    </footer>
  );
}
