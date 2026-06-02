'use client'
import { createContext, useContext, useState, useEffect } from 'react'

type BrandContextType = {
  brandName: string
  setBrandName: (name: string) => void
  themeColor: string
  setThemeColor: (color: string) => void
  logoUrl: string
  setLogoUrl: (url: string) => void
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brandName, setBrandName] = useState('RASMSB')
  const [themeColor, setThemeColor] = useState('#1e3a8a') // Defaults to our corporate blue
  const [logoUrl, setLogoUrl] = useState('')

  // Sync variations instantly with browser storage across components
  useEffect(() => {
    const savedName = localStorage.getItem('global_brand_name')
    const savedColor = localStorage.getItem('global_theme_color')
    const savedLogo = localStorage.getItem('global_logo_url')
    if (savedName) setBrandName(savedName)
    if (savedColor) setThemeColor(savedColor)
    if (savedLogo) setLogoUrl(savedLogo)
  }, [])

  return (
    <BrandContext.Provider value={{ brandName, setBrandName, themeColor, setThemeColor, logoUrl, setLogoUrl }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (!context) throw new Error('useBrand must be used inside a BrandProvider')
  return context
}