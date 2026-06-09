'use client'
import { useState } from 'react'

export default function SOPPage() {
  const [expandedSopIds, setExpandedSopIds] = useState<number[]>([1, 2, 3])

  // Track active language selection tab per individual card ID ('en' | 'ms' | 'ne')
  const [cardLanguages, setCardLanguages] = useState<{ [key: number]: 'en' | 'ms' | 'ne' }>({
    1: 'en',
    2: 'en',
    3: 'en'
  })

  // Hardcoded translation database matrix for exact 1-to-1 layout preservation
  const translations: { [key: number]: { ms: string; ne: string } } = {
    1: {
      ms: '1. Sertamerta bunyikan sistem penggera kebakaran pusat.\n2. Hubungi HQ Bomba Selangor (03-7846 4444) dan laporkan blok bangunan yang tepat.\n3. Arahkan pengawal untuk mengosongkan semua tangga laluan kecemasan dan membuka kunci pagar utama.\n4. Pandu penduduk ke zon perhimpunan yang ditetapkan di kawasan padang utama.\n5. Pastikan laluan akses di pintu masuk utama sentiasa lapang untuk kenderaan kecemasan yang tiba.',
      ne: '1. तुरुन्तै केन्द्रीय आगोको अलार्म प्रणाली बजाउनुहोस्।\n2. बोम्बा सेलाङ्गोर मुख्यालय (०३-७८४६ ४४४४) मा कल गरी यकिन भवन ब्लकहरूको रिपोर्ट गर्नुहोस्।\n3. सुरक्षाकर्मीहरूलाई सबै आपतकालीन निकास सीढीहरू खाली गर्न र मुख्य परिधि गेटहरू अनलक गर्न निर्देशन दिनुहोस्।\n4. बासिन्दाहरूलाई मुख्य खेल मैदान क्षेत्रमा तोकिएको भेला हुने क्षेत्रमा मार्गदर्शन गर्नुहोस्।\n5. आउने आपतकालीन सवारी साधनहरूको लागि मुख्य प्रवेशद्वारमा स्पष्ट पहुँच लाइनहरू कायम राख्नुहोस्।'
    },
    2: {
      ms: '1. Pasukan pengawal mesti melakukan rondaan clocking bersama 30 minit sebelum penyerahan rasmi tugas.\n2. Log semua ketidakpadanan lejar pelawat dan parking-parikir salah ke dalam portal utama.\n3. Periksa dan sahkan secara fizikal semua kunci utama dan radio komunikasi pondok pengawal keselamatan.\n4. Pastikan konsol portal carian pondok pengawal telah log masuk dan beroperasi dengan lancar.\n5. Kedua-dua ketua pasukan yang masuk dan keluar mesti menandatangani buku syif harian.',
      ne: '१. आधिकारिक ह्यान्डलभर हुनु भन्दा ३० मिनेट अघि सुरक्षा टोलीले संयुक्त रूपमा क्लोकिङ राउन्ड गर्नुपर्छ।\n२. सबै आगन्तुक लेजर विसंगतिहरू र पार्किङ उल्लङ्घनहरू मास्टर पोर्टलमा दर्ता गर्नुहोस्।\n३. सबै मास्टर कुञ्जीहरू र सुरक्षा गार्ड हाउस सञ्चार रेडियोहरू शारीरिक रूपमा जाँच र प्रमाणित गर्नुहोस्।\n४. गार्ड हाउस खोज कन्सोल लग इन भएको र सहज रूपमा सञ्चालन भएको सुनिश्चित गर्नुहोस्।\n५. आउने र जाने दुवै टोली प्रमुखहरूले दैनिक सिफ्ट बुकमा हस्ताक्षर गर्नुपर्छ।'
    },
    3: {
      ms: '1. Sahkan dengan serta-merta jika penjana sandaran automatik mula berfungsi dalam masa 15 saat.\n2. Hantar pengawal 1 untuk memeriksa blok lif penumpang secara manual jika ada penduduk terperangkap.\n3. Hidupkan lampu kecemasan sekunder di kawasan meja pengawal keselamatan utama.\n4. Kerahkan pengawal dengan lampu suluh berkuasa tinggi untuk meronda tanjakan tempat letak kereta bawah tanah dan lobi lif.\n5. Maklumkan talian penting Pengurusan Bangunan dengan segera untuk log sokongan teknikal sandaran.',
      ne: '१. १५ सेकेन्डभित्र स्वचालित ब्याकअप जेनेरेटर चल्छ कि चल्दैन तुरुन्तै प्रमाणित गर्नुहोस्।\n२. फसेका बासिन्दाहरू पत्ता लगाउन लिफ्ट ब्लकहरू म्यानुअल रूपमा निरीक्षण गर्न गार्ड १ लाई पठाउनुहोस्।\n३. मुख्य सुरक्षा गार्ड डेस्क क्षेत्रमा माध्यमिक आपतकालीन बत्तीहरू अन गर्नुहोस्।\n४. बेसमेन्ट कारपार्क र लिफ्ट लबीहरू गस्ती गर्न उच्च शक्तिको टर्चसहित गार्डहरू खटाउनुहोस्।\n५. प्राविधिक ब्याकअप सहयोगको लागि तुरुन्तै भवन व्यवस्थापनहटलाइनमा सूचित गर्नुहोस्।'
    }
  }

  const sopList = [
    {
      id: 1,
      title: 'FIRE EMERGENCY EVACUATION PROTOCOL',
      lastUpdated: '16-05-2026',
      content: '1. Immediately sound the central fire alarm system.\n2. Call Bomba Selangor HQ (03-7846 4444) and report exact building blocks.\n3. Direct guards to clear all emergency exit staircases and unlock main perimeter gates.\n4. Guide residents to the designated assembly zone at the main field area.\n5. Maintain clear access lines at the main entrance for incoming emergency vehicles.'
    },
    {
      id: 2,
      title: 'NIGHT SHIFT HANDOVER REGULATION',
      lastUpdated: '15-05-2026',
      content: '1. Guard teams must conduct a joint clocking round 30 minutes before official handover.\n2. Log all visitor ledger discrepancies and parking violations into the master portal.\n3. Physically check and verify all master keys and security guard house communication radios.\n4. Ensure the guard house search portal console is logged in and operating smoothly.\n5. Both incoming and outgoing team leads must sign off on the daily shift book.'
    },
    {
      id: 3,
      title: 'TOTAL POWER FAILURE (BLACKOUT) PROCEDURES',
      lastUpdated: '10-05-2026',
      content: '1. Immediately verify if the automated backup generator kicks on within 15 seconds.\n2. Dispatch guard 1 to manually inspect passenger lift blocks for any trapped residents.\n3. Switch on secondary emergency lights at the main security guard desk area.\n4. Deploy guards with high-power torches to patrol basement carpark ramps and lift lobbies.\n5. Notify the Building Management hotline immediately to log technical backup support.'
    }
  ]

  const toggleSop = (id: number) => {
    if (expandedSopIds.includes(id)) {
      setExpandedSopIds(expandedSopIds.filter(sopId => sopId !== id))
    } else {
      setExpandedSopIds([...expandedSopIds, id])
    }
  }

  const changeCardLanguage = (id: number, lang: 'en' | 'ms' | 'ne') => {
    setCardLanguages(prev => ({ ...prev, [id]: lang }))
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
      
      {/* MODULE TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>STANDARD OPERATING PROCEDURES (SOP)</h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: 0 }}>Configure and publish corporate guard instructions synced to mobile units.</p>
        </div>
        <button onClick={() => alert('Onboarding fresh template...')} style={{ backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add SOP</button>
      </div>

      {/* CORE SOP ACCORDION STACK */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', width: '100%' }}>
        {sopList.map((sop) => {
          const isOpen = expandedSopIds.includes(sop.id)
          const currentLang = cardLanguages[sop.id] || 'en'

          let displayContent = sop.content
          if (currentLang === 'ms') {
            displayContent = translations[sop.id].ms
          } else if (currentLang === 'ne') {
            displayContent = translations[sop.id].ne
          }

          return (
            <div key={sop.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
              
              {/* TRIGGER ROW PANEL */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', borderBottom: isOpen ? '2px solid #e2e8f0' : 'none', padding: '18px 25px', width: '100%', boxSizing: 'border-box' }}>
                <div>
                  <span style={{ fontSize: '15px', color: '#1e3a8a', fontWeight: 'bold', letterSpacing: '0.3px' }}>{sop.title}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '500' }}>LAST MODIFIED: {sop.lastUpdated}</span>
                </div>

                {/* THE INSTANTLY VISIBLE AUTOMATED LANGUAGE SELECTOR ROW */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '6px' }} onClick={(e) => e.stopPropagation()}>
                    {[
                      { code: 'en', label: 'EN' },
                      { code: 'ms', label: 'BM' },
                      { code: 'ne', label: 'नेपाली' }
                    ].map((lang) => {
                      const isCurrent = currentLang === lang.code
                      return (
                        <button
                          key={lang.code}
                          onClick={() => changeCardLanguage(sop.id, lang.code as any)}
                          style={{ backgroundColor: isCurrent ? '#1e3a8a' : 'transparent', color: isCurrent ? 'white' : '#475569', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {lang.label}
                        </button>
                      )
                    })}
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); alert('Editing...'); }} style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); alert('Deleting...'); }} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', width: '32px', height: '32px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                  <button onClick={() => toggleSop(sop.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#1e3a8a', fontSize: '20px', cursor: 'pointer', padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</button>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '25px 35px', backgroundColor: 'white' }}>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '15px', color: '#334155', lineHeight: '1.8', fontWeight: '500' }}>
                    {displayContent}
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>

    </div>
  )
}
