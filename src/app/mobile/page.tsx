export default function MobileLoginPage() {
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#1e3a8a', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', border: '2px solid #3b82f6' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '24px' }}>RAS</span>
        </div>
        <h2 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: '800' }}>RASMSB MOBILE LINK</h2>
        <p style={{ color: '#94a3b8', margin: '5px 0 0 0', fontSize: '13px' }}>ENTER GUARD STAFF ID OR ASSIGNED TERMINAL KEY</p>
      </div>

      <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', width: '100%', maxWidth: '360px', padding: '30px', boxSizing: 'border-box', border: '1px solid #334155' }}>
        <form action="/mobile/auth" method="post" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>OFFICER STAFF ID OR USERNAME</label>
            <input
              name="login_id"
              type="text"
              placeholder="e.g. RAS-001"
              autoComplete="username"
              required
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>PASSWORD / PASSCODE</label>
            <input
              name="access_pin"
              type="password"
              placeholder="e.g. pass123"
              autoComplete="current-password"
              required
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '14px 0', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Secure Authorization
          </button>

          <div style={{ color: '#64748b', fontSize: '10px', textAlign: 'center', fontWeight: '700', letterSpacing: '0.2px' }}>
            Server verified login mode
          </div>
        </form>
      </div>
    </div>
  )
}
