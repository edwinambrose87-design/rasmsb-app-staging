'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function MobileLoginPage() {
  const router = useRouter()
  const [loginId, setLoginId] = useState('')
  const [accessPin, setAccessPin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanRawInput = loginId.trim()
    const structuredIdUpper = cleanRawInput.toUpperCase()
    const structuredIdLower = cleanRawInput.toLowerCase()
    const structuredPin = accessPin.trim()

    if (!cleanRawInput || !structuredPin) return

    setIsVerifying(true)
    setErrorMessage(null)

    try {
      if (structuredIdUpper.startsWith('TERM-')) {
        const { data: terminalDevice } = await supabase
          .from('device_terminals')
          .select('terminal_id, project_slug, access_pin')
          .eq('access_pin', structuredPin)
          .or(`terminal_id.eq.${structuredIdUpper},terminal_id.eq.${structuredIdLower}`)
          .maybeSingle()

        if (terminalDevice) {
          router.push(`/mobile/company_terminal?project=${terminalDevice.project_slug}&terminal=${terminalDevice.terminal_id}`)
          return
        }
      }

      // 🔍 Query guards table directly using Staff ID / Name and custom password hash
      const { data: guardProfile } = await supabase
        .from('guards')
        .select('id, name, app_password_hash, staff_id')
        .eq('app_password_hash', structuredPin)
        .or(`name.eq.${cleanRawInput},staff_id.eq.${cleanRawInput}`)
        .maybeSingle()

      if (guardProfile) {
        // 💾 Save the verified Guard ID to session storage so dashboard can read it without Auth User middleware
        sessionStorage.setItem('active_guard_id', guardProfile.id)
        
        // ➔ Forward cleanly straight to personal dashboard folder path
        router.push(`/mobile/personal_dashboard`)
        return
      }

      setErrorMessage('Security Auth Failure: Invalid Credentials or Password.')

    } catch (err) {
      setErrorMessage('Network fault: Failed to handshake with security servers.')
    } finally {
      setIsVerifying(false)
    }
  }

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
        <form onSubmit={handleMobileLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>OFFICER STAFF ID OR USERNAME</label>
            <input 
              type="text" 
              placeholder="e.g. RAS-001"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={isVerifying}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>PASSWORD / PASSCODE</label>
            <input 
              type="password" 
              placeholder="e.g. pass123"
              value={accessPin}
              onChange={(e) => setAccessPin(e.target.value)}
              disabled={isVerifying}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {errorMessage && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            style={{ width: '100%', backgroundColor: isVerifying ? '#3b82f6' : '#2563eb', color: 'white', border: 'none', padding: '14px 0', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: isVerifying ? 'not-allowed' : 'pointer' }}
          >
            {isVerifying ? 'Validating Connection Securely...' : 'Secure Authorization ➔'}
          </button>
        </form>
      </div>
    </div>
  )
}