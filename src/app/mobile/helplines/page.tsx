'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const CONTACT_CATEGORIES = [
  'BOMBA (FIRE DEPARTMENT)',
  'POLICE (POLIS DIRAJA MALAYSIA)',
  'HOSPITAL (MEDICAL EMERGENCY)',
  'MANAGEMENT CONTACT DETAILS'
]

interface EmergencyContact {
  id?: string
  type?: 'contact' | 'category'
  category?: string
  name?: string
  role?: string
  phone?: string
  email?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function MobileHelplinesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project_id')
  const guardId = searchParams.get('guard_id')

  const [projectName, setProjectName] = useState('Emergency Contacts')
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (!projectId) {
        setContacts([])
        setProjectName('Emergency Contacts')
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('name, contacts_list')
        .eq('id', projectId)
        .maybeSingle()

      if (error) throw error
      setProjectName(data?.name || 'Emergency Contacts')
      setContacts((data?.contacts_list || []) as EmergencyContact[])
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load emergency contacts.')
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const groupedContacts = useMemo(() => {
    const contactCategories = contacts
      .map(contact => contact.category)
      .filter(Boolean) as string[]
    const allCategories = Array.from(new Set([...CONTACT_CATEGORIES, ...contactCategories]))

    return allCategories.map(category => ({
      category,
      contacts: contacts.filter(contact => contact.type !== 'category' && (contact.category || CONTACT_CATEGORIES[3]) === category)
    }))
  }, [contacts])

  const goBack = () => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (guardId) params.set('guard_id', guardId)
    router.push(`/mobile/personal_dashboard?${params.toString()}`)
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', width: '100vw', padding: '20px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <button onClick={goBack} style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #dbe3ef', backgroundColor: '#ffffff', color: '#1e3a8a', fontSize: '20px', fontWeight: '900' }}>
          &lt;
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '1px' }}>SITE HELPLINES</div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e3a8a' }}>{projectName}</div>
        </div>
      </div>

      {isLoading && <div style={messageStyle}>Loading helplines...</div>}
      {!isLoading && errorMessage && <div style={{ ...messageStyle, color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>{errorMessage}</div>}
      {!isLoading && !errorMessage && contacts.length === 0 && <div style={messageStyle}>No emergency contacts configured for this site.</div>}

      {!isLoading && !errorMessage && contacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {groupedContacts.map(section => section.contacts.length > 0 && (
            <section key={section.category} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 18px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ backgroundColor: '#eff6ff', color: '#1e3a8a', fontSize: '12px', fontWeight: '900', letterSpacing: '0.3px', padding: '13px 16px', borderBottom: '1px solid #dbeafe' }}>
                {section.category}
              </div>
              <div style={{ padding: '4px 16px' }}>
                {section.contacts.map((contact, index) => (
                  <a key={contact.id || `${contact.name}-${index}`} href={`tel:${(contact.phone || '').replace(/[^\d+]/g, '')}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '16px 0', borderBottom: index === section.contacts.length - 1 ? 'none' : '1px solid #f1f5f9', textDecoration: 'none' }}>
                    <div>
                      <div style={{ color: '#0f172a', fontSize: '15px', fontWeight: '900' }}>{contact.name}</div>
                      {contact.role && <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>{contact.role}</div>}
                      <div style={{ color: '#1e3a8a', fontSize: '13px', fontWeight: '800', marginTop: '6px' }}>{contact.phone}</div>
                    </div>
                    <div aria-label={`Call ${contact.name}`} style={{ minWidth: '48px', width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 18px rgba(5, 150, 105, 0.25)', border: '3px solid #ecfdf5' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.68-.37 1.05-.25 1.15.38 2.39.58 3.65.58.58 0 1.04.46 1.04 1.04v3.49c0 .58-.46 1.04-1.04 1.04C10.64 21.08 2.92 13.36 2.92 3.89c0-.58.46-1.04 1.04-1.04h3.5c.58 0 1.04.46 1.04 1.04 0 1.26.2 2.5.58 3.65.11.37.03.77-.26 1.05l-2.2 2.2z" fill="currentColor" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
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

export default function MobileHelplinesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', color: '#64748b', fontWeight: '800' }}>Loading helplines...</div>}>
      <MobileHelplinesContent />
    </Suspense>
  )
}
