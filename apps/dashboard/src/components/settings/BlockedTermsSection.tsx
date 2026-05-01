import { useState } from 'react'
import { X } from 'lucide-react'
import { useBlockedTerms, useAddBlockedTerm, useDeleteBlockedTerm } from '@/hooks/useBlockedTerms'
import { Select, Input, Button } from '@/components/ui'

const BLOCKED_TERM_TYPE_OPTIONS = [
  { value: 'email_domain', label: 'Email Domain' },
  { value: 'profile_name', label: 'Profile Name' },
]

export function BlockedTermsSection(): JSX.Element {
  const { data: blockedTerms, isLoading, error } = useBlockedTerms()
  const addTerm = useAddBlockedTerm()
  const deleteTerm = useDeleteBlockedTerm()
  const [newTerm, setNewTerm] = useState('')
  const [newTermType, setNewTermType] = useState<'email_domain' | 'profile_name'>('email_domain')

  const emailDomains = blockedTerms?.filter((t) => t.type === 'email_domain') ?? []
  const profileNames = blockedTerms?.filter((t) => t.type === 'profile_name') ?? []

  return (
    <div className="card p-6">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-xs font-medium text-red-600">Failed to load blocked terms</p>
        </div>
      )}
      {isLoading && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
          Loading blocked terms...
        </div>
      )}
      <h2 className="text-sm font-display font-semibold text-gray-900 mb-1">Blocked Terms</h2>
      <p className="text-xs text-gray-400 mb-4">
        Filter out unwanted results from discovery and scraping
      </p>

      <form
        className="flex items-center gap-2 mb-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newTerm.trim()) return
          addTerm.mutate({ term: newTerm, type: newTermType }, { onSuccess: () => setNewTerm('') })
        }}
      >
        <Input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="e.g. spam.com or badprofile"
          className="flex-1"
          fullWidth={false}
        />
        <Select
          value={newTermType}
          onChange={(v) => setNewTermType(v as 'email_domain' | 'profile_name')}
          options={BLOCKED_TERM_TYPE_OPTIONS}
        />
        <Button type="submit" variant="primary" disabled={addTerm.isPending || !newTerm.trim()}>
          {addTerm.isPending ? 'Adding...' : 'Add'}
        </Button>
      </form>

      <TermList
        title="Email Domains"
        terms={emailDomains}
        colorClass="red"
        onDelete={(id) => deleteTerm.mutate(id)}
      />
      <TermList
        title="Profile Names"
        terms={profileNames}
        colorClass="orange"
        onDelete={(id) => deleteTerm.mutate(id)}
      />
    </div>
  )
}

function TermList({
  title,
  terms,
  colorClass,
  onDelete,
}: {
  title: string
  terms: Array<{ id: string; term: string }>
  colorClass: 'red' | 'orange'
  onDelete: (id: string) => void
}): JSX.Element {
  return (
    <div className={colorClass === 'red' ? 'mb-4' : ''}>
      <h3 className="text-xs font-medium text-gray-700 mb-2">{title}</h3>
      {terms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {terms.map((t) => (
            <span
              key={t.id}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                colorClass === 'red'
                  ? 'bg-red-50 text-red-600 ring-red-600/20'
                  : 'bg-orange-50 text-orange-600 ring-orange-600/20'
              }`}
            >
              {t.term}
              <button
                onClick={() => onDelete(t.id)}
                className={`ml-0.5 ${
                  colorClass === 'red'
                    ? 'text-red-500 hover:text-red-300'
                    : 'text-orange-500 hover:text-orange-300'
                }`}
                aria-label={`Remove ${t.term}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No blocked terms yet</p>
      )}
    </div>
  )
}
