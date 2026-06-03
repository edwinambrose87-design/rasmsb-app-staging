'use client'
import { useState, useEffect, useRef } from 'react'
import { useBrand } from '@/context/BrandContext'
import { createBrowserClient } from '@supabase/ssr'

export default function GlobalBrandingPage() {
  const { themeColor, setThemeColor, setBrandName, setLogoUrl } = useBrand()
  const [logo, setLogo] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('RASMSB')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize Supabase Client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Screen-Centered Custom Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Enterprise Security Color Palette
  const masterPalette = [
    '#0F172A', '#1E293B', '#334155', '#475569', // Slates
    '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', // Blues
    '#312E81', '#4338CA', '#4F46E5', '#6366F1', // Indigos
    '#064E3B', '#047857', '#059669', '#10B981', // Emeralds
    '#7F1D1D', '#B91C1C', '#DC2626', '#EF4444', // Reds
    '#78350F', '#B45309', '#D97706', '#F59E0B'  // Ambers
  ]

  const [savedColors, setSavedColors] = useState<string[]>(['#332D7A'])
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null)
  const [shadeOffset, setShadeOffset] = useState(0)
  const [recordId, setRecordId] = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 1. Fetch live branding settings from Supabase on component mount
  useEffect(() => {
    async function fetchLiveBranding() {
      try {
        const { data, error } = await supabase
          .from('global_branding')
          .select('*')
          .limit(1)
        
        if (error) throw error
        
        if (data && data.length > 0) {
          const config = data[0]
          setRecordId(config.id)
          setOrgName(config.organization_name)
          setLogo(config.logo_url)
          setShadeOffset(config.brightness_adjustment || 0)
          
          if (config.theme_color) {
            setThemeColor(config.theme_color.toUpperCase())
          }
        }
      } catch (err: any) {
        console.error('Error fetching global configurations from Supabase:', err)
      }
    }
    fetchLiveBranding()
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleColorInput = (newHex: string) => {
    setThemeColor(newHex.toUpperCase())
    setShadeOffset(0)
  }

  const saveCurrentColor = () => {
    if (!savedColors.includes(themeColor.toUpperCase())) {
      setSavedColors([themeColor.toUpperCase(), ...savedColors].slice(0, 10))
      showToast('Swatch added to layout memory presets.', 'info')
    }
  }

  const removeColor = (colorToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedColors(prev => prev.filter(c => c !== colorToRemove))
  }

  const applyShade = (color: string, percent: number) => {
    let hex = color.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    if (hex.length !== 6) return color
    const f = parseInt(hex, 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent
    const R = f >> 16, G = (f >> 8) & 0x00FF, B = f & 0x0000FF
    return `#${(0x1000000 + Math.round((t - R) * p) + R * 0x10000 + Math.round((t - G) * p) + G * 0x100 + Math.round((t - B) * p) + B).toString(16).slice(1).toUpperCase()}`
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setShadeOffset(val)
    setThemeColor(applyShade(themeColor, val / 100))
  }

  // 2. Publish changes straight to the cloud dataset and context headers
  const handlePublishBrandingToSupabase = async () => {
    try {
      const brandingPayload = {
        organization_name: orgName,
        theme_color: themeColor,
        logo_url: logo,
        brightness_adjustment: shadeOffset
      }

      if (recordId) {
        // Row exists: Execute clean UPDATE transaction
        const { error } = await supabase
          .from('global_branding')
          .update(brandingPayload)
          .eq('id', recordId)
        
        if (error) throw error
      } else {
        // Fallback safety check: Execute clean INSERT if table is empty
        const { error } = await supabase
          .from('global_branding')
          .insert([brandingPayload])
        
        if (error) throw error
      }

      // Propagate configurations across live UI Context variables dynamically
      if (setBrandName) setBrandName(orgName)
      if (setLogoUrl) setLogoUrl(logo || '')

      showToast('🚀 System UI assets published and synced successfully!', 'success')
    } catch (err: any) {
      showToast(`❌ Configuration Synchronization Error: ${err.message}`, 'error')
    }
  }

  const labelStyle = { fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }

  return (
    <div style={{ padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh', position: 'relative' }}>
      
      {/* SCREEN-CENTERED TOAST NOTIFICATION POPUP */}
      {toast && (
        <div style={{ position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '30px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap' }}>
          <span>{toast.message}</span>
        </div>
      )}

      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: themeColor, margin: '0 0 8px 0', transition: 'color 0.3s ease' }}>Global Branding</h1>
        <p style={{ color: '#64748B', margin: 0, fontSize: '15px' }}>Configure master brand assets and interface theming.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '30px', maxWidth: '1200px' }}>
        
        {/* LEFT COLUMN: CONTROLS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* LOGO & NAME CARD */}
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            <h2 style={{ fontSize: '14px', color: '#1E293B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '24px' }}>Core Identity</h2>
            
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#F1F5F9', borderRadius: '12px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logo ? <img src={logo} alt="Brand Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600' }}>No Logo</span>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: '700', color: '#334155', cursor: 'pointer', alignSelf: 'flex-start', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  {logo ? 'Replace Image' : 'Upload Image'}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Organization Name</label>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#F8FAFC', color: '#1e293b', fontWeight: '600' }} />
            </div>
          </div>

          {/* ADVANCED COLOR ENGINE CARD */}
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            <h2 style={{ fontSize: '14px', color: '#1E293B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
              Theme Color Engine
              <span style={{ color: themeColor, backgroundColor: `${themeColor}15`, padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{themeColor}</span>
            </h2>

            <div style={{ marginBottom: '30px' }}>
              <label style={labelStyle}>Master Palette</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
                {masterPalette.map((hex) => (
                  <button key={hex} type="button" onClick={() => handleColorInput(hex)} title={hex}
                    style={{ width: '100%', aspectRatio: '1/1', borderRadius: '6px', backgroundColor: hex, border: themeColor === hex ? '3px solid #1E293B' : '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Custom HEX Input</label>
                <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                  <div style={{ width: '40px', backgroundColor: themeColor, borderRight: '1px solid #CBD5E1' }}></div>
                  <input type="text" value={themeColor.toUpperCase()} onChange={(e) => handleColorInput(e.target.value)} style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', backgroundColor: 'transparent', fontFamily: 'monospace', fontWeight: 'bold' }} />
                  <button type="button" onClick={saveCurrentColor} style={{ backgroundColor: '#E2E8F0', border: 'none', borderLeft: '1px solid #CBD5E1', padding: '0 16px', fontWeight: '800', color: '#334155', cursor: 'pointer' }}>Save</button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Saved Swatches</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', minHeight: '42px', alignItems: 'center' }}>
                  {savedColors.map((hex) => (
                    <div key={hex} onMouseEnter={() => setHoveredSwatch(hex)} onMouseLeave={() => setHoveredSwatch(null)} style={{ position: 'relative' }}>
                      <button type="button" onClick={() => handleColorInput(hex)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: hex, border: themeColor === hex ? '2px solid #1E293B' : '2px solid white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: 0 }} />
                      {hoveredSwatch === hex && (
                        <button type="button" onClick={(e) => removeColor(hex, e)} style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                  {savedColors.length === 0 && <span style={{ fontSize: '12px', color: '#94A3B8' }}>No saved colors</span>}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Fine-Tune Brightness</label>
              </div>
              <input type="range" min="-50" max="50" value={shadeOffset} onChange={handleSliderChange} style={{ width: '100%', cursor: 'pointer', accentColor: themeColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginTop: '8px', fontWeight: '800', textTransform: 'uppercase' }}>
                <span>Darken</span>
                <span>Original Base</span>
                <span>Lighten</span>
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: PREVIEW & PUBLISH */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Interface Preview</h3>
            </div>
            
            <div style={{ padding: '40px 24px', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                
                {/* Navbar Simulator */}
                <div style={{ height: '64px', backgroundColor: themeColor, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', transition: 'background-color 0.1s ease' }}>
                  <div style={{ width: '36px', height: '36px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {logo ? <img src={logo} alt="Logo" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} /> : <div style={{ width: '16px', height: '16px', backgroundColor: themeColor, borderRadius: '4px' }}></div>}
                  </div>
                  <span style={{ color: 'white', fontWeight: '900', fontSize: '18px', letterSpacing: '0.5px' }}>{orgName || 'BRAND'}</span>
                </div>

                {/* Content Simulator */}
                <div style={{ padding: '24px', display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <div style={{ height: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', width: '30%' }}></div>
                  <div style={{ height: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', width: '80%' }}></div>
                  <div style={{ height: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', width: '60%' }}></div>
                </div>

              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={handlePublishBrandingToSupabase} 
            style={{ width: '100%', padding: '18px', backgroundColor: '#10B981', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s ease' }} 
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} 
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Publish Branding Changes
          </button>

        </aside>

      </div>
    </div>
  )
}