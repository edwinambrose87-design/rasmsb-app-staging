'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

type LanguageCode = 'en' | 'ms' | 'ne'

interface JdItem {
  id?: string
  title?: string
  content_en?: string
  content_ms?: string
  content_ne?: string
  last_updated?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function MobileJobDescriptionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project_id')
  const guardId = searchParams.get('guard_id')

  const [projectName, setProjectName] = useState('Site Job Descriptions')
  const [jds, setjds] = useState<JdItem[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, LanguageCode>>({})
  const [expandedjdIds, setExpandedjdIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const fetchjds = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (!projectId) {
        setProjectName('Site Job Descriptions')
        setjds([])
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('name, jd_list')
        .eq('id', projectId)
        .maybeSingle()

      if (error) throw error

      const sitejds = normalizejds(data?.jd_list)
      setProjectName(data?.name || 'Site Job Descriptions')
      setjds(sitejds)
      setSelectedLanguages(Object.fromEntries(sitejds.map(jd => [getjdId(jd), 'en'])) as Record<string, LanguageCode>)
      setExpandedjdIds(getDefaultExpandedjdIds(sitejds))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load site job descriptions.')
      setjds([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchjds()
  }, [fetchjds])

  const goBack = () => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (guardId) params.set('guard_id', guardId)
    router.push(`/mobile/personal_dashboard?${params.toString()}`)
  }

  const handleSecureLogout = () => {
    sessionStorage.clear()
    localStorage.removeItem('active_guard_id')
    localStorage.removeItem('ras_project_title')
    router.replace('/mobile')
  }

  const togglejd = (jdId: string) => {
    setExpandedjdIds(current => current.includes(jdId) ? current.filter(id => id !== jdId) : [...current, jdId])
  }

  const changeLanguage = (jdId: string, language: LanguageCode) => {
    setSelectedLanguages(current => ({ ...current, [jdId]: language }))
  }

  const renderedjds = useMemo(() => jds.map((jd, index) => {
    const jdId = getjdId(jd, index)
    const language = selectedLanguages[jdId] || 'en'
    return {
      ...jd,
      jdId,
      language,
      isExpanded: expandedjdIds.includes(jdId),
      visibleContent: getJDContent(jd, language)
    }
  }), [expandedjdIds, selectedLanguages, jds])

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', width: '100vw', padding: '0 20px 30px 20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px 15px 4px', width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '-0.5px' }}>RASMSB</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => alert('No active corporate broadcast dispatches found.')} aria-label="Notifications" style={{ position: 'relative', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}>
            <span style={{ fontSize: '22px', color: '#1e3a8a' }}>🔔</span>
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
          </button>
          <button onClick={() => setIsDrawerOpen(true)} aria-label="Open menu" style={{ display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', padding: '4px', border: 'none', background: 'transparent' }}>
            <span style={menuLineStyle} />
            <span style={menuLineStyle} />
            <span style={menuLineStyle} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <button onClick={goBack} style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #dbe3ef', backgroundColor: '#ffffff', color: '#1e3a8a', fontSize: '20px', fontWeight: '900' }}>
          &lt;
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '1px' }}>SITE JOB DESCRIPTIONS</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e3a8a' }}>{projectName}</div>
        </div>
      </div>

      {isLoading && <div style={messageStyle}>Loading site job descriptions...</div>}
      {!isLoading && errorMessage && <div style={{ ...messageStyle, color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>{errorMessage}</div>}
      {!isLoading && !errorMessage && jds.length === 0 && <div style={messageStyle}>No job descriptions configured for this site.</div>}

      {!isLoading && !errorMessage && renderedjds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderedjds.map(jd => (
            <section key={jd.jdId} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 18px rgba(15, 23, 42, 0.04)' }}>
              <button onClick={() => togglejd(jd.jdId)} style={{ width: '100%', border: 'none', backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: '900', lineHeight: 1.35 }}>{jd.title}</span>
                  <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '800', marginTop: '4px' }}>UPDATED: {formatDisplayDate(jd.last_updated || '')}</span>
                </span>
                <span style={{ fontSize: '18px', fontWeight: '900', transform: jd.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
              </button>

              {jd.isExpanded && (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {[
                      { code: 'en', label: 'EN' },
                      { code: 'ms', label: 'BM' },
                      { code: 'ne', label: 'NE' }
                    ].map(language => {
                      const isActive = jd.language === language.code
                      return (
                        <button key={language.code} onClick={() => changeLanguage(jd.jdId, language.code as LanguageCode)} style={{ minWidth: '44px', border: 'none', borderRadius: '10px', padding: '8px 10px', backgroundColor: isActive ? '#1e3a8a' : '#f1f5f9', color: isActive ? '#ffffff' : '#475569', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>
                          {language.label}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ color: '#334155', fontSize: '13px', lineHeight: 1.7, fontWeight: '600', whiteSpace: 'pre-line' }}>
                    {jd.visibleContent || 'No content added for this language.'}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        transition: 'opacity 0.3s ease-in-out, visibility 0.3s',
        opacity: isDrawerOpen ? 1 : 0,
        visibility: isDrawerOpen ? 'visible' : 'hidden'
      }} onClick={() => setIsDrawerOpen(false)}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80%',
          maxWidth: '310px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 25px -5px rgba(15, 23, 42, 0.15)',
          padding: '30px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.3s ease-in-out',
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)'
        }} onClick={(event) => event.stopPropagation()}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.3px' }}>Terminal Account</span>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontWeight: 'bold' }}>X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
              <button onClick={goBack} style={drawerButtonStyle}>Back to Dashboard</button>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operational Post</label>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569', marginTop: '3px', lineHeight: '1.3' }}>{projectName}</div>
              </div>
            </div>
          </div>

          <button onClick={handleSecureLogout} style={{ width: '100%', height: '48px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Sign Out Terminal
          </button>
        </div>
      </div>
    </div>
  )
}

function normalizejds(jds: unknown) {
  return coerceJdList(jds)
    .filter(jd => jd && (jd.title || jd.content_en || jd.content_ms || jd.content_ne))
    .map((jd, index) => ({
      ...jd,
      id: getjdId(jd, index),
      title: jd.title || 'Untitled JD'
    }))
}

function coerceJdList(value: unknown): JdItem[] {
  if (Array.isArray(value)) return value as JdItem[]
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed as JdItem[]
      if (parsed && typeof parsed === 'object') return [parsed as JdItem]
    } catch {
      return []
    }
  }
  if (typeof value === 'object') return [value as JdItem]
  return []
}

function getDefaultExpandedjdIds(jds: JdItem[]) {
  return jds.length > 0 ? [getjdId(jds[0])] : []
}

function getjdId(jd: JdItem, fallbackIndex = 0) {
  return jd.id || `${jd.title || 'jd'}-${fallbackIndex}`
}

function getJDContent(jd: JdItem, language: LanguageCode) {
  if (language === 'ms') return jd.content_ms || jd.content_en || ''
  if (language === 'ne') return jd.content_ne || jd.content_en || ''
  return jd.content_en || ''
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${day}/${month}/${year}`
}

const messageStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '22px',
  color: '#64748b',
  fontSize: '14px',
  fontWeight: '800',
  textAlign: 'center' as const
}

const menuLineStyle = {
  width: '22px',
  height: '3px',
  backgroundColor: '#1e3a8a',
  borderRadius: '2px'
}

const drawerButtonStyle = {
  width: '100%',
  height: '44px',
  backgroundColor: '#eff6ff',
  border: '1px solid #dbeafe',
  borderRadius: '12px',
  color: '#1e3a8a',
  fontSize: '13px',
  fontWeight: '800',
  cursor: 'pointer',
  textAlign: 'left' as const,
  padding: '0 14px'
}

export default function MobileJobDescriptionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', color: '#64748b', fontWeight: '800' }}>Loading site job descriptions...</div>}>
      <MobileJobDescriptionsContent />
    </Suspense>
  )
}

