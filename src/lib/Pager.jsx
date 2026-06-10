const P = {
  gold: '#B8D4E8', goldBg: 'rgba(184,212,232,0.08)', goldBorder: 'rgba(184,212,232,0.18)',
  muted: 'rgba(255,255,255,0.22)', border: 'rgba(255,255,255,0.07)',
}

function btn(active, disabled) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 30, height: 30, borderRadius: 8, padding: '0 6px',
    fontSize: 12, fontFamily: 'Jost,sans-serif', fontWeight: active ? 700 : 400,
    cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${active ? P.goldBorder : P.border}`,
    background: active ? P.goldBg : 'transparent',
    color: active ? P.gold : disabled ? 'rgba(255,255,255,0.12)' : P.muted,
    transition: 'all .15s',
  }
}

function pages(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const set = new Set([0, total - 1, page])
  for (let d = -2; d <= 2; d++) { const p = page + d; if (p >= 0 && p < total) set.add(p) }
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…')
    out.push(sorted[i])
  }
  return out
}

export default function Pager({ page, total, perPage = 6, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const from = page * perPage + 1
  const to   = Math.min((page + 1) * perPage, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: '1.25rem', flexWrap: 'wrap' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 0} style={btn(false, page === 0)}>‹</button>
      {pages(page, totalPages).map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: 'Jost,sans-serif', padding: '0 2px' }}>…</span>
          : <button key={p} onClick={() => onChange(p)} style={btn(p === page, false)}>{p + 1}</button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages - 1} style={btn(false, page === totalPages - 1)}>›</button>
      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif', marginLeft: 6 }}>
        {from}–{to} / {total}
      </span>
    </div>
  )
}
