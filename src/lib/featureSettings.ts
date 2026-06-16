export type FeatureKey = 'attendance' | 'clocking' | 'emergency' | 'sop' | 'incident' | 'vms'

export interface FeatureDefinition {
  key: FeatureKey
  label: string
  description: string
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { key: 'attendance', label: 'Attendance', description: 'Guard duty sign-in and sign-out tile.' },
  { key: 'clocking', label: 'Start Clocking', description: 'QR patrol clocking rounds and clocking report.' },
  { key: 'emergency', label: 'Emergency Contact', description: 'Site emergency helpline directory.' },
  { key: 'sop', label: 'SOP', description: 'Site standing orders and SOP handbook.' },
  { key: 'incident', label: 'Incident Report', description: 'Incident report workspace.' },
  { key: 'vms', label: 'VMS', description: 'Visitor management module.' }
]

export const DEFAULT_FEATURE_ACCESS: Record<FeatureKey, boolean> = FEATURE_DEFINITIONS.reduce(
  (access, feature) => ({ ...access, [feature.key]: true }),
  {} as Record<FeatureKey, boolean>
)

export function buildFeatureAccess(rows: Array<{ feature_key: string; is_enabled: boolean }> | null | undefined) {
  const access = { ...DEFAULT_FEATURE_ACCESS }

  rows?.forEach((row) => {
    if (row.feature_key in access) {
      access[row.feature_key as FeatureKey] = row.is_enabled
    }
  })

  return access
}
