import { useState } from 'react'
import { usePipelineActivities } from '@/hooks/usePipeline'
import { getFollowUpStatus } from '@/hooks/useFollowUpStatus'
import { DetailCard } from '@/components/ui'
import { PipelineDetailHeader } from './PipelineDetailHeader'
import { PipelineDetailOverview } from './PipelineDetailOverview'
import { PipelineDetailEmails } from './PipelineDetailEmails'
import { PipelineDetailEdit } from './PipelineDetailEdit'
import type { Tab, PipelineDetailProps } from './pipelineDetailTypes'

export function PipelineDetail({ entry, onClose, onMoveStage }: PipelineDetailProps): JSX.Element {
  const { data: activities } = usePipelineActivities(entry.id)
  const [tab, setTab] = useState<Tab>('overview')

  const followUp = getFollowUpStatus(entry)
  const daysInStage = Math.floor((Date.now() - new Date(entry.stage_entered_at).getTime()) / 86_400_000)
  const sentEmails = (activities ?? []).filter(
    (a) => a.type === 'email_sent' || a.description.toLowerCase().includes('email'),
  )

  return (
    <DetailCard
      open
      onClose={onClose}
      header={
        <PipelineDetailHeader entry={entry} tab={tab} onTabChange={setTab} onClose={onClose} />
      }
    >
      {followUp.urgency !== 'none' && (
        <div
          className={`mb-4 rounded-md p-3 text-sm font-medium ${
            followUp.urgency === 'critical'
              ? 'bg-red-50 text-red-600'
              : followUp.urgency === 'urgent'
                ? 'bg-orange-50 text-orange-600'
                : followUp.urgency === 'overdue'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
          }`}
        >
          {followUp.label}
        </div>
      )}

      {tab === 'overview' && (
        <PipelineDetailOverview
          entry={entry}
          activities={activities}
          daysInStage={daysInStage}
          onMoveStage={onMoveStage}
          onTabChange={setTab}
          onClose={onClose}
        />
      )}

      {tab === 'emails' && <PipelineDetailEmails entry={entry} sentEmails={sentEmails} />}

      {tab === 'edit' && <PipelineDetailEdit entry={entry} onClose={onClose} />}
    </DetailCard>
  )
}
