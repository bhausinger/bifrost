import type { PipelineEntry } from '@/types'

export type FollowUpUrgency = 'none' | 'due' | 'overdue' | 'urgent' | 'critical'

interface FollowUpStatus {
  urgency: FollowUpUrgency
  daysSinceContact: number
  label: string
  /** Tailwind border color class for the card */
  borderColor: string
  /** Tailwind bg color class for the card */
  bgColor: string
}

const THRESHOLDS = {
  due: 3, // 3 days since last contact — time to follow up
  overdue: 7, // 7 days — should have followed up
  urgent: 14, // 14 days — getting cold
  critical: 21, // 21 days — probably lost
} as const

/**
 * Returns follow-up urgency for pipeline entries in contact-dependent stages.
 * Only applies to 'contacted' and 'responded' stages where follow-up matters.
 */
export function getFollowUpStatus(entry: PipelineEntry): FollowUpStatus {
  const contactStages = ['contacted', 'responded', 'follow_up']

  if (!contactStages.includes(entry.stage)) {
    return {
      urgency: 'none',
      daysSinceContact: 0,
      label: '',
      borderColor: '',
      bgColor: '',
    }
  }

  // Use the most recent relevant date
  const lastDate =
    entry.responded_at ?? entry.contacted_at ?? entry.stage_entered_at
  const days = Math.floor(
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (days >= THRESHOLDS.critical) {
    return {
      urgency: 'critical',
      daysSinceContact: days,
      label: `${days}d — no response`,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
    }
  }
  if (days >= THRESHOLDS.urgent) {
    return {
      urgency: 'urgent',
      daysSinceContact: days,
      label: `${days}d — follow up now`,
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-50',
    }
  }
  if (days >= THRESHOLDS.overdue) {
    return {
      urgency: 'overdue',
      daysSinceContact: days,
      label: `${days}d — overdue`,
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
    }
  }
  if (days >= THRESHOLDS.due) {
    return {
      urgency: 'due',
      daysSinceContact: days,
      label: `${days}d — follow up`,
      borderColor: 'border-blue-400',
      bgColor: 'bg-blue-50',
    }
  }

  return {
    urgency: 'none',
    daysSinceContact: days,
    label: '',
    borderColor: '',
    bgColor: '',
  }
}
