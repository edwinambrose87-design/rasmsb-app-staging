'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useBrand } from '@/context/BrandContext'

const CONTACT_CATEGORIES = [
  'BOMBA (FIRE DEPARTMENT)',
  'POLICE (POLIS DIRAJA MALAYSIA)',
  'HOSPITAL (MEDICAL EMERGENCY)',
  'MANAGEMENT CONTACT DETAILS'
]

interface ProjectRow {
  id: string
  name: string
  slug: string
  contacts_list: EmergencyContact[]
}

interface EmergencyContact {
  id?: string
  type?: 'contact' | 'category'
  category?: string
  name?: string
  role?: string
  phone?: string
  email?: string
}

const emptyContact: EmergencyContact = {
  category: CONTACT_CATEGORIES[0],
  name: '',
  role: '',
  phone: '',
  email: ''
}

function EmergencyContactContent() {
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
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<EmergencyContact>(emptyContact)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (!activeProjectSlug) {
        setActiveProject(null)
        setContacts([])
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, contacts_list')
        .eq('slug', activeProjectSlug)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setActiveProject(null)
        setContacts([])
        return
      }

      const project = data as ProjectRow
      setActiveProject(project)
      setContacts(normalizeContacts(project.contacts_list || []))
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load emergency contacts.')
      setActiveProject(null)
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [activeProjectSlug, supabase])

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
      contacts: contacts
        .map((contact, index) => ({ contact, index }))
        .filter(({ contact }) => contact.type !== 'category' && (contact.category || CONTACT_CATEGORIES[3]) === category)
    }))
  }, [contacts])

  const openAddModal = (category: string) => {
    setEditingIndex(null)
    setFormData({ ...emptyContact, category })
    setIsModalOpen(true)
  }

  const openEditModal = (contact: EmergencyContact, index: number) => {
    setEditingIndex(index)
    setFormData({
      category: contact.category || CONTACT_CATEGORIES[3],
      name: contact.name || '',
      role: contact.role || '',
      phone: contact.phone || '',
      email: contact.email || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIndex(null)
    setFormData(emptyContact)
  }

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false)
    setCategoryName('')
  }

  const saveContacts = async (nextContacts: EmergencyContact[], successMessage: string) => {
    if (!activeProject) return
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const cleanedContacts = nextContacts.map(cleanContact)
      const { error } = await supabase
        .from('projects')
        .update({ contacts_list: cleanedContacts })
        .eq('id', activeProject.id)

      if (error) throw error
      setContacts(cleanedContacts)
      closeModal()
      showToast(successMessage)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save contact changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!(formData.name || '').trim() || !(formData.phone || '').trim()) {
      setErrorMessage('Contact name and phone number are required.')
      return
    }

    const nextContacts = [...contacts]
    const nextContact = cleanContact({
      ...formData,
      id: editingIndex === null ? crypto.randomUUID() : contacts[editingIndex]?.id || crypto.randomUUID()
    })

    if (editingIndex === null) {
      nextContacts.push(nextContact)
      await saveContacts(nextContacts, 'Emergency contact added.')
    } else {
      nextContacts[editingIndex] = nextContact
      await saveContacts(nextContacts, 'Emergency contact updated.')
    }
  }

  const handleAddCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextCategory = categoryName.trim()

    if (!nextCategory) {
      setErrorMessage('Category name is required.')
      return
    }

    const categoryExists = groupedContacts.some(section => section.category.toLowerCase() === nextCategory.toLowerCase())
    if (categoryExists) {
      setErrorMessage('This category already exists for the selected site.')
      return
    }

    await saveContacts([
      ...contacts,
      {
        id: crypto.randomUUID(),
        type: 'category',
        category: nextCategory,
        name: '',
        phone: ''
      }
    ], 'Emergency category added.')
    closeCategoryModal()
  }

  const deleteContact = async (index: number) => {
    const contact = contacts[index]
    if (!contact) return
    if (!confirm(`Delete ${contact.name}?`)) return

    await saveContacts(contacts.filter((_, contactIndex) => contactIndex !== index), 'Emergency contact deleted.')
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: '#10b981', color: 'white', padding: '12px 26px', borderRadius: '30px', fontSize: '13px', fontWeight: '800', boxShadow: '0 10px 24px rgba(16, 185, 129, 0.25)' }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: '35px', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, margin: 0 }}>
            EMERGENCY CONTACT CONFIG
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px' }}>
            {activeProject ? `Manage emergency contacts for ${activeProject.name}.` : 'Manage site emergency contacts synced to the mobile app.'}
          </p>
        </div>
        {activeProject && (
          <button onClick={() => setIsCategoryModalOpen(true)} style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '12px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 5px rgba(15, 23, 42, 0.08)' }}>
            + Add Category
          </button>
        )}
      </div>

      {isLoading && (
        <div style={messageBoxStyle}>Loading emergency contacts...</div>
      )}

      {!isLoading && errorMessage && (
        <div style={{ ...messageBoxStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>{errorMessage}</div>
      )}

      {!isLoading && !activeProject && !errorMessage && (
        <div style={messageBoxStyle}>Select a monitoring site to manage emergency contacts.</div>
      )}

      {!isLoading && activeProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', width: '100%' }}>
          {groupedContacts.map((section) => (
            <div key={section.category} style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '15px 22px' }}>
                <span style={{ fontSize: '14px', color: themeColor, fontWeight: 'bold', letterSpacing: '0.4px' }}>
                  {section.category}
                </span>
                <button onClick={() => openAddModal(section.category)} style={{ backgroundColor: themeColor, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                  + Add Contact
                </button>
              </div>

              <div style={{ padding: '10px 20px 18px 20px', overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>STATION / OFFICER NAME</th>
                      <th style={thStyle}>ROLE / NOTES</th>
                      <th style={thStyle}>CONTACT NUMBER</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.contacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '22px 10px', fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>No contacts in this category.</td>
                      </tr>
                    ) : section.contacts.map(({ contact, index }, displayIndex) => (
                      <tr key={contact.id || `${contact.name}-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdMuted}>{displayIndex + 1}</td>
                        <td style={tdStrong}>{contact.name}</td>
                        <td style={tdMuted}>{contact.role || '-'}</td>
                        <td style={{ ...tdStrong, fontFamily: 'monospace' }}>{contact.phone}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                          <button onClick={() => openEditModal(contact, index)} style={secondaryButtonStyle}>Edit</button>
                          <button onClick={() => deleteContact(index)} style={deleteButtonStyle} title="Delete contact">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
          <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '14px', width: '92%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 35px rgba(15, 23, 42, 0.18)' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', color: themeColor }}>{editingIndex === null ? `Add ${formatCategoryTitle(formData.category)}` : `Edit ${formatCategoryTitle(formData.category)}`}</h2>
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>{formData.category}</p>

            <label style={labelStyle}>Station / Officer Name</label>
            <input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} style={inputStyle} placeholder="e.g. Balai Bomba Shah Alam" required />

            <label style={labelStyle}>Role / Notes</label>
            <input value={formData.role || ''} onChange={(event) => setFormData({ ...formData, role: event.target.value })} style={inputStyle} placeholder="e.g. Site Building Manager" />

            <label style={labelStyle}>Contact Number</label>
            <input value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} style={inputStyle} placeholder="e.g. 03-7846 4444" required />

            <label style={labelStyle}>Email</label>
            <input value={formData.email || ''} onChange={(event) => setFormData({ ...formData, email: event.target.value })} style={inputStyle} placeholder="Optional" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={closeModal} style={secondaryButtonStyle}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ backgroundColor: isSaving ? '#94a3b8' : themeColor, color: 'white', border: 'none', padding: '10px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '800', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
          <form onSubmit={handleAddCategory} style={{ backgroundColor: 'white', borderRadius: '14px', width: '92%', maxWidth: '460px', padding: '28px', boxShadow: '0 20px 35px rgba(15, 23, 42, 0.18)' }}>
            <h2 style={{ margin: '0 0 18px 0', fontSize: '20px', color: themeColor }}>Add Category</h2>

            <label style={labelStyle}>Category Title</label>
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} style={inputStyle} placeholder="e.g. Lift Contractor / Utility Provider" required />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={closeCategoryModal} style={secondaryButtonStyle}>Cancel</button>
              <button type="submit" disabled={isSaving} style={{ backgroundColor: isSaving ? '#94a3b8' : themeColor, color: 'white', border: 'none', padding: '10px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: '800', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function normalizeContacts(contacts: EmergencyContact[]) {
  return contacts.map((contact) => cleanContact(contact))
}

function cleanContact(contact: EmergencyContact): EmergencyContact {
  if (contact.type === 'category') {
    return {
      id: contact.id || crypto.randomUUID(),
      type: 'category',
      category: (contact.category || '').trim(),
      name: '',
      phone: ''
    }
  }

  return {
    id: contact.id || crypto.randomUUID(),
    type: 'contact',
    category: contact.category || CONTACT_CATEGORIES[3],
    name: (contact.name || '').trim(),
    role: (contact.role || '').trim(),
    phone: (contact.phone || '').trim(),
    email: (contact.email || '').trim()
  }
}

function formatCategoryTitle(category?: string) {
  const value = category || 'Contact'
  return value
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase())
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

const thStyle = {
  padding: '12px 10px',
  fontSize: '11px',
  color: '#64748b'
}

const tdMuted = {
  padding: '14px 10px',
  fontSize: '13px',
  color: '#64748b'
}

const tdStrong = {
  padding: '14px 10px',
  fontSize: '13px',
  color: '#1e293b',
  fontWeight: '700'
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

const secondaryButtonStyle = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '8px 13px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  marginRight: '8px'
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

export default function EmergencyContactPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#64748b', fontWeight: '700' }}>Loading emergency contacts...</div>}>
      <EmergencyContactContent />
    </Suspense>
  )
}
