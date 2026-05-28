import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

const SERVICES = [
  { id: 1, name: 'Haircut',    name_ar: 'قص الشعر',    duration: 45,  price: 50  },
  { id: 2, name: 'Colour',     name_ar: 'صبغة الشعر',   duration: 120, price: 140 },
  { id: 3, name: 'Highlights', name_ar: 'هايلايت',      duration: 150, price: 120 },
  { id: 4, name: 'Blowout',    name_ar: 'تمليس',        duration: 45,  price: 55  },
  { id: 5, name: 'Treatment',  name_ar: 'علاج الشعر',   duration: 60,  price: 75  },
  { id: 6, name: 'Keratin',    name_ar: 'كيراتين',      duration: 180, price: 250 },
];

const STAFF = [
  { id: 1, name: 'Sarah',  role: 'Senior Stylist',   role_ar: 'مصففة أولى' },
  { id: 2, name: 'Nina',   role: 'Colour Specialist', role_ar: 'متخصصة صبغ' },
  { id: 3, name: 'Layla',  role: 'Stylist',           role_ar: 'مصففة' },
];

const SLOTS = ['09:00','09:45','10:30','11:15','12:00','13:30','14:15','15:00','15:45','16:30','17:15'];

export default function Booking() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep]             = useState(0);
  const [service, setService]       = useState(null);
  const [staff, setStaff]           = useState(null);
  const [selectedDate, setDate]     = useState(null);
  const [selectedTime, setTime]     = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [booked, setBooked]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [myAppts, setMyAppts]       = useState([]);

  const today    = startOfDay(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i));

  useEffect(() => { if (user) loadMyAppts(); }, [user]);
  useEffect(() => { if (selectedDate && staff) loadBooked(); }, [selectedDate, staff]);

  async function loadBooked() {
    const { data } = await supabase.from('appointments').select('time')
      .eq('staff_id', staff.id).eq('date', format(selectedDate, 'yyyy-MM-dd')).neq('status', 'cancelled');
    setBooked((data ?? []).map(r => r.time));
  }

  async function loadMyAppts() {
    const { data } = await supabase.from('appointments').select('*, service_name, staff_name')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(10);
    setMyAppts(data ?? []);
  }

  async function handleConfirm() {
    if (!user) { navigate('/signin', { state: { from: '/book' } }); return; }
    setLoading(true);
    const { error } = await supabase.from('appointments').insert({
      user_id: user.id, service_id: service.id, service_name: service.name,
      staff_id: staff.id, staff_name: staff.name,
      date: format(selectedDate, 'yyyy-MM-dd'), time: selectedTime,
      duration: service.duration, price: service.price, status: 'pending',
    });
    setLoading(false);
    if (!error) { setSuccess(true); loadMyAppts(); }
  }

  async function cancelAppt(id) {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    loadMyAppts();
  }

  const statusColor = { pending: 'var(--gold)', confirmed: 'var(--sage)', cancelled: 'var(--clay)', done: 'rgba(255,255,255,0.4)' };
  const statusLabel = { pending: t('booking_status_pending'), confirmed: t('booking_status_confirmed'), cancelled: t('booking_status_cancelled'), done: t('booking_status_done') };

  if (success) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="page-header">
          <h1>{t('booking_confirmed')}</h1>
        </div>
        <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', border: '1px solid var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: 'var(--sage)' }}>
            <Check size={24} />
          </div>
          <h2 style={{ color: '#fff', fontWeight: 400, fontSize: '1.5rem', marginBottom: '12px' }}>{t('booking_confirmed')}</h2>
          <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '6px' }}>{service?.name} — {staff?.name}</p>
          <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '36px' }}>{selectedDate && format(selectedDate, 'EEEE d MMMM')} at {selectedTime}</p>
          <button onClick={() => { setSuccess(false); setStep(0); setService(null); setStaff(null); setDate(null); setTime(null); }} className="btn">
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  const stepRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', overflowX: 'auto', paddingBottom: '4px' }}>
      {[t('booking_service'), t('booking_staff'), t('booking_date'), t('booking_confirm')].map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 400,
            background: i < step ? 'var(--sage)' : i === step ? 'var(--gold)' : 'transparent',
            color: i <= step ? '#1a1917' : 'var(--text)',
            border: i > step ? '1px solid var(--border)' : 'none',
          }}>
            {i < step ? <Check size={12} /> : i + 1}
          </div>
          <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: i === step ? '#ffffff' : 'var(--text)' }}>
            {label}
          </span>
          {i < 3 && <div style={{ width: '24px', height: '1px', background: 'var(--border)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('booking_title')}</h1>
        <div className="breadcrumb">
          <span>Home</span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span>{t('booking_title')}</span>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        {stepRow}

        {/* STEP 0 — Service */}
        {step === 0 && (
          <div className="grid sm:grid-cols-2 fade-up" style={{ gap: '1px', background: 'var(--border)' }}>
            {SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => { setService(s); setStep(1); }}
                style={{
                  textAlign: 'left', padding: '20px 24px',
                  background: service?.id === s.id ? 'rgba(201,168,76,0.08)' : 'var(--bg-card)',
                  border: 'none', borderLeft: service?.id === s.id ? '2px solid var(--gold)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (service?.id !== s.id) e.currentTarget.style.background = '#282624'; }}
                onMouseLeave={e => { if (service?.id !== s.id) e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                <div style={{ fontSize: '15px', fontWeight: 400, color: '#ffffff', marginBottom: '6px' }}>
                  {lang === 'ar' ? s.name_ar : s.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {s.duration} min
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--gold)' }}>${s.price}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 1 — Staff */}
        {step === 1 && (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
            {STAFF.map(s => (
              <button
                key={s.id}
                onClick={() => { setStaff(s); setStep(2); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  textAlign: 'left', padding: '18px 24px',
                  background: 'var(--bg-card)', border: 'none',
                  borderLeft: '2px solid transparent', cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderLeftColor = 'var(--gold)'; e.currentTarget.style.background = '#282624'; }}
                onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                <div style={{ width: '40px', height: '40px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 400, fontSize: '15px', flexShrink: 0 }}>
                  {s.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 400, color: '#ffffff' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{lang === 'ar' ? s.role_ar : s.role}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setStep(0)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <ChevronLeft size={14} />{t('back')}
            </button>
          </div>
        )}

        {/* STEP 2 — Date & Time */}
        {step === 2 && (
          <div className="fade-up">
            {/* Week nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: weekOffset === 0 ? 'not-allowed' : 'pointer', color: 'var(--text)', opacity: weekOffset === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                {weekDays.map(d => {
                  const past = d < today;
                  const sel  = selectedDate && isSameDay(d, selectedDate);
                  return (
                    <button key={d.toISOString()} onClick={() => { if (!past) { setDate(d); setTime(null); } }} disabled={past}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px',
                        background: sel ? 'var(--gold)' : 'transparent',
                        color: sel ? '#1a1917' : past ? 'var(--border)' : 'rgba(255,255,255,0.7)',
                        border: sel ? 'none' : '1px solid transparent',
                        cursor: past ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!past && !sel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (!past && !sel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{format(d, 'EEE')}</span>
                      <span style={{ fontSize: '15px', fontWeight: 400, marginTop: '3px' }}>{format(d, 'd')}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setWeekOffset(w => w + 1)}
                style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)' }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedDate && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '12px' }}>
                  {format(selectedDate, 'EEEE d MMMM')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {SLOTS.map(slot => {
                    const taken = booked.includes(slot);
                    const sel   = selectedTime === slot;
                    return (
                      <button key={slot} onClick={() => { if (!taken) setTime(slot); }} disabled={taken}
                        style={{
                          padding: '10px 4px', fontSize: '13px', fontWeight: 300,
                          border: '1px solid', borderColor: sel ? 'var(--gold)' : 'var(--border)',
                          background: sel ? 'var(--gold)' : 'transparent',
                          color: sel ? '#1a1917' : taken ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
                          cursor: taken ? 'not-allowed' : 'pointer',
                          textDecoration: taken ? 'line-through' : 'none',
                          fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <ChevronLeft size={14} />{t('back')}
              </button>
              {selectedDate && selectedTime && (
                <button onClick={() => setStep(3)} className="btn" style={{ marginLeft: 'auto' }}>
                  {t('booking_confirm')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 — Confirm */}
        {step === 3 && (
          <div className="fade-up">
            <div style={{ border: '1px solid var(--border)', marginBottom: '24px' }}>
              {[
                [t('booking_service'), lang === 'ar' ? service?.name_ar : service?.name],
                [t('booking_staff'),   staff?.name],
                [t('booking_date'),    selectedDate && format(selectedDate, 'EEEE d MMMM yyyy')],
                [t('booking_time'),    selectedTime],
                ['Duration',           `${service?.duration} min`],
                ['Price',              `$${service?.price}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', letterSpacing: '0.08em', color: 'var(--text)', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#ffffff' }}>{value}</span>
                </div>
              ))}
            </div>

            {!user && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', padding: '12px 16px', border: '1px solid var(--border-gold)', marginBottom: '20px' }}>
                {t('booking_login_required')}
              </p>
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <ChevronLeft size={14} />{t('back')}
              </button>
              <button onClick={handleConfirm} disabled={loading || !user} className="btn" style={{ marginLeft: 'auto', opacity: (loading || !user) ? 0.5 : 1 }}>
                {loading ? t('loading') : t('booking_confirm')}
              </button>
            </div>
          </div>
        )}

        {/* My Appointments */}
        {user && myAppts.length > 0 && (
          <div style={{ marginTop: '60px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
            <h2 style={{ color: '#fff', fontWeight: 400, fontSize: '1.2rem', marginBottom: '20px' }}>
              {t('booking_your_appointments')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
              {myAppts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-card)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 400, color: '#ffffff' }}>{a.service_name} — {a.staff_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '3px' }}>{a.date} at {a.time}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `1px solid ${statusColor[a.status]}`, color: statusColor[a.status] }}>
                      {statusLabel[a.status]}
                    </span>
                    {a.status === 'pending' && (
                      <button onClick={() => cancelAppt(a.id)} style={{ fontSize: '11px', color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em' }}>
                        {t('booking_cancel')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
