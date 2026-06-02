'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [dbLogoUrl, setDbLogoUrl] = useState<string | null>(null)

  // Asset loading gatekeepers
  const [isAssetReady, setIsAssetReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [fadeSplash, setFadeSplash] = useState(false)

  // System security verification text monitor
  const [verificationStatus, setVerificationStatus] = useState('Verifying terminal connection parameters...')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch corporate branding assets from database on load
  useEffect(() => {
    async function streamIdentityAssets() {
      try {
        const { data, error } = await supabase
          .from('global_branding')
          .select('logo_url')
          .limit(1)

        if (!error && data && data.length > 0) {
          setDbLogoUrl(data[0].logo_url)
        }
      } catch (err) {
        console.error('Failed to resolve dynamic corporate branding matrices:', err)
      } finally {
        setIsAssetReady(true)
      }
    }
    
    streamIdentityAssets()
  }, [supabase])

  // Manages the cinematic timeline or skips it entirely based on incoming URL flags
  useEffect(() => {
    if (!isAssetReady) return

    const params = new URLSearchParams(window.location.search)
    const isLogoutAction = params.get('logout') === 'true'
    const errorParam = params.get('error')

    if (errorParam === 'unauthorized_identity') {
      setErrorMessage('ACCESS_DENIED_ALARM')
    } else if (errorParam === 'auth_callback_failed') {
      setErrorMessage('Secure session initialization failed. Please re-authenticate.')
    }

    // Skip the splash screen entirely if the user was rejected or logged out
    if (isLogoutAction || errorParam === 'unauthorized_identity') {
      setShowSplash(false)
      setFadeSplash(true)
      return
    }

    const statusTimer1 = setTimeout(() => {
      setVerificationStatus('Syncing secure workspace environment...')
    }, 3000)

    const statusTimer2 = setTimeout(() => {
      setVerificationStatus('Access granted. Initializing gateway...')
    }, 6000)

    const fadeTimer = setTimeout(() => {
      setFadeSplash(true)
    }, 9000)

    const unmountTimer = setTimeout(() => {
      setShowSplash(false)
    }, 9500)

    return () => {
      clearTimeout(statusTimer1)
      clearTimeout(statusTimer2)
      clearTimeout(fadeTimer)
      clearTimeout(unmountTimer)
    }
  }, [isAssetReady])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid authorization credentials provided.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setErrorMessage(err.message || 'OAuth initialization failed.')
    }
  }

  // NEW: Secure Reset Password Trigger function
  const handleForgotPassword = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email) {
      setErrorMessage('Please type your email address into the input field first.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      })
      if (error) throw error
      
      setSuccessMessage('Secure password reset link has been dispatched to your inbox.')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate password reset sequence.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAssetReady) {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1E3A8A' }} />
    )
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      <style>{`
        @keyframes splashPopIn {
          0% { transform: scale(0.95); opacity: 0; }
          8% { transform: scale(1); opacity: 1; }
          90% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.98); opacity: 0; }
        }
        @keyframes loginReveal {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes innerTextPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>

      {/* DYNAMIC CINEMATIC SPLASH SCREEN */}
      {showSplash && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#1E3A8A', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          opacity: fadeSplash ? 0 : 1,
          transition: 'opacity 0.4s ease-in-out, visibility 0.4s',
          visibility: fadeSplash ? 'hidden' : 'visible'
        }}>
          <div style={{
            textAlign: 'center',
            animation: 'splashPopIn 9.3s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ marginBottom: '24px' }}>
              {dbLogoUrl ? (
                <img src={dbLogoUrl} alt="Company Logo" style={{ width: '130px', height: 'auto', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', backgroundColor: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '36px' }}>🛡️</span>
                </div>
              )}
            </div>

            <h1 style={{ color: 'white', fontSize: '34px', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.5px', lineHeight: '1.1' }}>
              Rashid Azlan Security
            </h1>
            <h1 style={{ color: 'white', fontSize: '34px', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 0 0', letterSpacing: '0.5px', lineHeight: '1.1' }}>
              Sdn. Bhd.
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '4px', margin: '28px 0 30px 0' }}>
              Management Ecosystem
            </p>

            <div style={{ width: '220px', height: '1px', backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: '25px' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', minHeight: '24px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: verificationStatus.includes('granted') ? '#10B981' : '#FBBC05', animation: 'pulseDot 1.2s infinite ease-in-out' }}></div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {verificationStatus}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* MAIN CREDENTIALS ENTER WINDOW */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '440px', padding: '0 20px',
        animation: !showSplash ? 'loginReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
        opacity: showSplash ? 0 : 1
      }}>
        
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {dbLogoUrl ? (
            <img 
              src={dbLogoUrl} 
              alt="Company Logo" 
              style={{ width: '105px', height: 'auto', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ width: '64px', height: '64px', backgroundColor: '#1E3A8A', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(30, 58, 138, 0.15)' }}>
              <svg style={{ width: '28px', height: '28px', fill: 'none', stroke: 'white' }} viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          )}
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1E3A8A', margin: '0 0 4px 0', textAlign: 'center', letterSpacing: '-0.3px', textTransform: 'uppercase', lineHeight: '1.15' }}>
          Rashid Azlan Security
        </h1>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1E3A8A', margin: '0 0 8px 0', textAlign: 'center', letterSpacing: '-0.3px', textTransform: 'uppercase', lineHeight: '1.15' }}>
          Sdn. Bhd.
        </h1>
        
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px 0', textAlign: 'center', fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase', width: '100%', whiteSpace: 'nowrap' }}>
          Management Ecosystem
        </p>

        {/* ALIGNED SYMMETRIC LETTER-TRACKING ALARM FOR ILLEGAL USERS */}
        {errorMessage && errorMessage === 'ACCESS_DENIED_ALARM' && (
          <div style={{ 
            width: '100%', 
            textAlign: 'center',
            marginBottom: '22px',
            marginTop: '5px',
            animation: 'innerTextPulse 1.6s ease-in-out infinite',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#DC2626', letterSpacing: '0.5px', lineHeight: '1.0', margin: '0 0 6px 0', textTransform: 'uppercase', width: '100%', textAlign: 'center' }}>
              ACCESS DENIED
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#B91C1C', letterSpacing: '3.6px', lineHeight: '1.0', textTransform: 'uppercase', width: '100%', textAlign: 'center', paddingLeft: '3.6px' }}>
              UNAUTHORIZED PERSONNEL
            </div>
          </div>
        )}

        {/* Standard warning box fallback loop for direct manual form typing errors */}
        {errorMessage && errorMessage !== 'ACCESS_DENIED_ALARM' && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', color: '#D97706', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '18px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* NEW: Green success banner alert */}
        {successMessage && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '18px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            ✅ {successMessage}
          </div>
        )}

        {/* WHITE SHEET FORM CARD */}
        <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '16px', padding: '35px', border: '1px solid #E2E8F0', boxSizing: 'border-box', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}>
          
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{ width: '100%', height: '48px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', color: '#334155', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <svg style={{ width: '18px', height: '18px', display: 'block' }} viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.77H24v9.03h12.75c-.53 2.85-2.14 5.31-4.56 6.93l7.11 5.52C43.46 36.56 46.5 30.87 46.5 24z"/>
              <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.11-5.52c-1.97 1.32-4.5 2.13-8.78 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }}></div>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '800', padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }}></div>
          </div>

          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg style={{ width: '18px', height: '18px', position: 'absolute', left: '14px', stroke: '#94A3B8', fill: 'none' }} viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input required type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', height: '44px', padding: '0 16px 0 44px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', color: '#1E293B', outline: 'none' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', margin: 0 }}>Password</label>
                {/* FIXED: Attached onClick listener link directly here */}
                <span 
                  onClick={handleForgotPassword}
                  style={{ fontSize: '12px', fontWeight: '600', color: '#1E3A8A', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg style={{ width: '18px', height: '18px', position: 'absolute', left: '14px', stroke: '#94A3B8', fill: 'none' }} viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', height: '44px', padding: '0 16px 0 44px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', color: '#1E293B', outline: 'none' }} />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              style={{ width: '100%', height: '46px', backgroundColor: '#1E3A8A', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '6px', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Authorizing Session...' : 'Log in'}
            </button>
          </form>

        </div>

        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '16px', textAlign: 'center', fontWeight: '500' }}>
          Not remember your account?{' '}
          <span 
            onClick={() => alert('Please coordinate with your operational duty manager or terminal IT helpdesk to execute a master credential reset.')}
            style={{ color: '#2563EB', fontWeight: '700', cursor: 'pointer' }}
          >
            Contact Admin
          </span>
        </p>

      </div>
    </div>
  )
}