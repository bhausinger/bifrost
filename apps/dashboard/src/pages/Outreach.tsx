import { useState } from 'react'
import { Mail, Plus } from 'lucide-react'
import { useEmailTemplates, useCreateEmailTemplate } from '@/hooks/useEmailTemplates'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select, Modal, Button, Input, Textarea, Label } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'

const TEMPLATE_CATEGORIES = [
  { value: 'initial_outreach', label: 'Initial Outreach' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'confirmation', label: 'Confirmation' },
]

export function Outreach() {
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useEmailTemplates()
  const createTemplate = useCreateEmailTemplate()
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCategory, setNewCategory] = useState('initial_outreach')

  const { data: emailRecords, error: emailError } = useQuery({
    queryKey: ['email-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  const totalSent = emailRecords?.length ?? 0
  const opened = emailRecords?.filter((e) => e.opened_at).length ?? 0
  const replied = emailRecords?.filter((e) => e.replied_at).length ?? 0
  const bounced = emailRecords?.filter((e) => e.status === 'bounced').length ?? 0

  async function handleCreateTemplate() {
    if (!newName || !newSubject || !newBody) return
    await createTemplate.mutateAsync({
      name: newName,
      subject: newSubject,
      body: newBody,
      category: newCategory,
    })
    setShowNewTemplate(false)
    setNewName('')
    setNewSubject('')
    setNewBody('')
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Mail}
        title="Outreach"
        description="Email templates and send history"
        actions={
          <Button variant="primary" onClick={() => setShowNewTemplate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">

      {(templatesError || emailError) && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">Failed to load outreach data</p>
          <p className="mt-1 text-xs text-red-400">{(templatesError ?? emailError)?.message}</p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-400">Total Sent</div>
          <div className="mt-1 font-mono text-2xl font-bold text-gray-900">{totalSent}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-400">Opened</div>
          <div className="mt-1 font-mono text-2xl font-bold text-blue-600">{opened}</div>
          <div className="mt-1 text-xs text-gray-400">
            {totalSent > 0 ? `${Math.round((opened / totalSent) * 100)}%` : '0%'} open rate
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-400">Replied</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">{replied}</div>
          <div className="mt-1 text-xs text-gray-400">
            {totalSent > 0 ? `${Math.round((replied / totalSent) * 100)}%` : '0%'} reply rate
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-400">Bounced</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-600">{bounced}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Templates */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Email Templates</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {templatesLoading && (
              <div className="p-6 text-sm text-gray-400">Loading...</div>
            )}
            {templates?.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">
                No templates yet. Create one to get started.
              </div>
            )}
            {templates?.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{t.name}</div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-300/50">
                    {t.category}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">{t.subject}</div>
                <div className="mt-1 text-xs text-gray-400 line-clamp-2">{t.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sends */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Sends</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {emailRecords?.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">
                No emails sent yet.
              </div>
            )}
            {emailRecords?.slice(0, 10).map((record) => (
              <div key={record.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{record.to_email}</div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      record.status === 'sent'
                        ? 'bg-blue-50 text-blue-600 ring-blue-600/20'
                        : record.status === 'opened'
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-600/20'
                          : record.status === 'replied'
                            ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                            : record.status === 'bounced'
                              ? 'bg-red-50 text-red-600 ring-red-600/20'
                              : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{record.subject}</div>
                <div className="mt-0.5 text-xs text-gray-400">
                  {new Date(record.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        title="New Email Template"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewTemplate(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateTemplate}
              disabled={!newName || !newSubject || !newBody}
            >
              Create Template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Initial Outreach" />
          </div>
          <div>
            <Label>Category</Label>
            <Select fullWidth value={newCategory} onChange={setNewCategory} options={TEMPLATE_CATEGORIES} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Email subject line" />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={8}
              className="font-mono"
              placeholder="Use {{artistName}}, {{deckLink}}, {{senderName}} as variables"
            />
          </div>
        </div>
      </Modal>
      </div>
    </div>
  )
}
