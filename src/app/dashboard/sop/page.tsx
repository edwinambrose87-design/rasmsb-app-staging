'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useBrand } from '@/context/BrandContext'

type LanguageCode = 'en' | 'ms' | 'ne'

interface ProjectRow {
  id: string
  name: string
  slug: string
  sop_list: SopItem[]
}

interface SopItem {
  id?: string
  title: string
  content_en: string
  content_ms?: string
  content_ne?: string
  last_updated?: string
}

const emptySop: SopItem = {
  title: '',
  content_en: '',
  content_ms: '',
  content_ne: '',
  last_updated: ''
}

function SOPContent() {
  const searchParams = useSearchParams()
  const activeProjectSlug = searchParams.get('project')
  const { themeColor } = useBrand()

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null)
  const [sops, setSops] = useState<SopItem[]>([])
  const [expandedSopIds, setExpandedSopIds] = useState<string[]>([])
  const [cardLanguages, setCardLanguages] = useState<Record<string, LanguageCode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingProject, setIsRefreshingProject] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<SopItem>(emptySop)
  const hasLoadedProjectRef = useRef(false)
  const requestSequenceRef = useRef(0)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchSops = useCallback(async () => {
    const requestId = requestSequenceRef.current + 1
    requestSequenceRef.current = requestId
    const isInitialLoad = !hasLoadedProjectRef.current
    if (isInitialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshingProject(true)
    }
    setErrorMessage(null)

    try {
      if (!activeProjectSlug) {
        setActiveProject(null)
        setSops([])
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, sop_list')
        .eq('slug', activeProjectSlug)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setActiveProject(null)
        setSops([])
        return
      }

      const project = data as ProjectRow
      const normalizedSops = normalizeSops(project.sop_list || [])
      if (requestId !== requestSequenceRef.current) return
      setActiveProject(project)
      setSops(normalizedSops)
      setExpandedSopIds(getDefaultExpandedSopIds(normalizedSops))
      setCardLanguages(Object.fromEntries(normalizedSops.map(sop => [sop.id || '', 'en'])))
      hasLoadedProjectRef.current = true
    } catch (err: any) {
      if (requestId !== requestSequenceRef.current) return
      setErrorMessage(err.message || 'Failed to load SOPs.')
      setActiveProject(null)
      setSops([])
    } finally {
      if (requestId !== requestSequenceRef.current) return
      setIsLoading(false)
      setIsRefreshingProject(false)
    }
  }, [activeProjectSlug, supabase])

  useEffect(() => {
    fetchSops()
  }, [fetchSops])

  const toggleSop = (id: string) => {
    setExpandedSopIds(current => current.includes(id) ? current.filter(sopId => sopId !== id) : [...current, id])
  }

  const changeCardLanguage = (id: string, lang: LanguageCode) => {
    setCardLanguages(prev => ({ ...prev, [id]: lang }))
  }

  const openAddModal = () => {
    setEditingIndex(null)
    setFormData(emptySop)
    setIsModalOpen(true)
  }

  const openEditModal = (sop: SopItem, index: number) => {
    setEditingIndex(index)
    setFormData({
      id: sop.id,
      title: sop.title || '',
      content_en: sop.content_en || '',
      content_ms: sop.content_ms || '',
      content_ne: sop.content_ne || '',
      last_updated: sop.last_updated || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIndex(null)
    setFormData(emptySop)
  }

  const saveSops = async (nextSops: SopItem[], successMessage: string) => {
    if (!activeProject) return
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const cleanedSops = nextSops.map(cleanSop)
      const { error } = await supabase
        .from('projects')
        .update({ sop_list: cleanedSops })
        .eq('id', activeProject.id)

      if (error) throw error
      setSops(cleanedSops)
      setExpandedSopIds(getDefaultExpandedSopIds(cleanedSops))
      closeModal()
      showToast(successMessage)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save SOP changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.title.trim() || !formData.content_en.trim()) {
      setErrorMessage('SOP title and content are required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const translatedContent = await translateSopContent(formData.content_en)
    const nextSops = [...sops]
    const nextSop = cleanSop({
      ...formData,
      id: editingIndex === null ? crypto.randomUUID() : sops[editingIndex]?.id || crypto.randomUUID(),
      content_ms: translatedContent.content_ms,
      content_ne: translatedContent.content_ne,
      last_updated: toInputDate(new Date())
    })

    if (editingIndex === null) {
      nextSops.push(nextSop)
      await saveSops(nextSops, 'SOP added.')
    } else {
      nextSops[editingIndex] = nextSop
      await saveSops(nextSops, 'SOP updated.')
    }
  }

  const deleteSop = async (index: number) => {
    const sop = sops[index]
    if (!sop) return
    if (!confirm(`Delete ${sop.title}?`)) return
    await saveSops(sops.filter((_, sopIndex) => sopIndex !== index), 'SOP deleted.')
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: '#10b981', color: 'white', padding: '12px 26px', borderRadius: '30px', fontSize: '13px', fontWeight: '800', boxShadow: '0 10px 24px rgba(16, 185, 129, 0.25)' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px', maxWidth: '1200px', width: '100%', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0 }}>STANDARD OPERATING PROCEDURES (SOP)</h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>
            {activeProject ? `Configure SOPs for ${activeProject.name}.` : 'Configure and publish guard instructions synced to mobile units.'}
          </p>
        </div>
        {activeProject && (
          <button onClick={openAddModal} style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add SOP</button>
        )}
      </div>

      {isRefreshingProject && (
        <div style={{ position: 'absolute', top: '24px', right: '32px', backgroundColor: '#ffffff', border: '1px solid #dbeafe', color: themeColor, padding: '9px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)', zIndex: 20 }}>
          Updating site SOPs...
        </div>
      )}

      {isLoading && <div style={messageBoxStyle}>Loading SOPs...</div>}
      {!isLoading && errorMessage && <div style={{ ...messageBoxStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>{errorMessage}</div>}
      {!isLoading && !activeProject && !errorMessage && <div style={messageBoxStyle}>Select a monitoring site to manage SOPs.</div>}
      {!isLoading && activeProject && !errorMessage && sops.length === 0 && <div style={messageBoxStyle}>No SOPs configured for this site yet.</div>}

      {!isLoading && activeProject && sops.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', width: '100%' }}>
          {sops.map((sop, index) => {
            const sopId = sop.id || String(index)
            const isOpen = expandedSopIds.includes(sopId)
            const currentLang = cardLanguages[sopId] || 'en'
            const displayContent = getSopContent(sop, currentLang)

            return (
              <div key={sopId} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', borderBottom: isOpen ? '2px solid #e2e8f0' : 'none', padding: '18px 25px', width: '100%', boxSizing: 'border-box', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '15px', color: themeColor, fontWeight: 'bold', letterSpacing: '0.3px' }}>{sop.title}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '500' }}>LAST MODIFIED: {formatDisplayDate(sop.last_updated || '')}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '6px' }} onClick={(event) => event.stopPropagation()}>
                      {[
                        { code: 'en', label: 'EN' },
                        { code: 'ms', label: 'BM' },
                        { code: 'ne', label: 'NE' }
                      ].map((lang) => {
                        const isCurrent = currentLang === lang.code
                        return (
                          <button key={lang.code} onClick={() => changeCardLanguage(sopId, lang.code as LanguageCode)} style={{ backgroundColor: isCurrent ? themeColor : 'transparent', color: isCurrent ? 'white' : '#475569', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {lang.label}
                          </button>
                        )
                      })}
                    </div>

                    <button onClick={() => openEditModal(sop, index)} style={secondaryButtonStyle}>Edit</button>
                    <button onClick={() => deleteSop(index)} style={deleteButtonStyle}>Delete</button>
                    <button onClick={() => toggleSop(sopId)} style={{ backgroundColor: 'transparent', border: 'none', color: themeColor, fontSize: '18px', cursor: 'pointer', padding: '8px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</button>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '25px 35px', backgroundColor: 'white' }}>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '15px', color: '#334155', lineHeight: '1.8', fontWeight: '500' }}>
                      {displayContent || 'No content added for this language.'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '14px', width: '92%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 35px rgba(15, 23, 42, 0.18)' }}>
            <h2 style={{ margin: '0 0 18px 0', fontSize: '20px', color: themeColor }}>{editingIndex === null ? 'Add SOP' : 'Edit SOP'}</h2>

            <label style={labelStyle}>SOP Title</label>
            <input value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={inputStyle} placeholder="e.g. Fire Emergency Evacuation Protocol" required />

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', color: '#64748b', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
              Last modified date will be generated automatically when this SOP is saved.
            </div>

            <label style={labelStyle}>SOP Content</label>
            <textarea value={formData.content_en} onChange={(event) => setFormData({ ...formData, content_en: event.target.value })} style={textareaStyle} placeholder="Enter SOP steps in English" required />

            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginTop: '8px', lineHeight: 1.5 }}>
              Bahasa Malaysia and Nepali versions will be generated automatically during save.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={closeModal} style={secondaryButtonStyle}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ backgroundColor: isSaving ? '#94a3b8' : themeColor, color: 'white', border: 'none', padding: '10px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '800', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Translating & Saving...' : 'Save SOP'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function normalizeSops(sops: SopItem[]) {
  return sops.map(cleanSop)
}

function getDefaultExpandedSopIds(sops: SopItem[]) {
  return sops[0]?.id ? [sops[0].id] : []
}

function cleanSop(sop: SopItem): SopItem {
  return {
    id: sop.id || crypto.randomUUID(),
    title: (sop.title || '').trim(),
    content_en: (sop.content_en || '').trim(),
    content_ms: (sop.content_ms || '').trim(),
    content_ne: (sop.content_ne || '').trim(),
    last_updated: sop.last_updated || toInputDate(new Date())
  }
}

function getSopContent(sop: SopItem, lang: LanguageCode) {
  if (lang === 'ms') return sop.content_ms || sop.content_en
  if (lang === 'ne') return sop.content_ne || sop.content_en
  return sop.content_en
}

async function translateSopContent(content: string) {
  try {
    const [malayResponse, nepaliResponse] = await Promise.all([
      requestTranslation(content, 'ms'),
      requestTranslation(content, 'ne')
    ])

    return {
      content_ms: malayResponse || content,
      content_ne: nepaliResponse || content
    }
  } catch {
    return {
      content_ms: content,
      content_ne: content
    }
  }
}

async function requestTranslation(content: string, target: LanguageCode) {
  if (target === 'en') return content

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: content, target })
  })

  if (!response.ok) return ''
  const data = await response.json()
  return String(data?.translatedText || '').trim()
}

function toInputDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const messageBoxStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '35px',
  color: '#64748b',
  fontWeight: '700',
  maxWidth: '1200px'
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '800',
  color: '#64748b',
  margin: '13px 0 6px 0'
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #cbd5e1',
  borderRadius: '7px',
  padding: '10px 12px',
  fontSize: '13px',
  outline: 'none',
  color: '#1e293b'
}

const textareaStyle = {
  ...inputStyle,
  minHeight: '120px',
  resize: 'vertical' as const,
  lineHeight: 1.5
}

const secondaryButtonStyle = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '8px 13px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer'
}

const deleteButtonStyle = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '8px 13px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer'
}

export default function SOPPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#64748b', fontWeight: '700' }}>Loading SOPs...</div>}>
      <SOPContent />
    </Suspense>
  )
}
