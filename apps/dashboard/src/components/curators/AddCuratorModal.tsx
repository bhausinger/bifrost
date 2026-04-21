import { useState } from 'react'
import { Input, Textarea, Select, Label, Modal, Button } from '@/components/ui'

type AddCuratorModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (curator: {
    name: string
    contact_name?: string
    email?: string
    genres?: string[]
    price_per_10k?: number
    payment_method?: string
    payment_handle?: string
    payment_code?: string
    notes?: string
  }) => void
  isSubmitting: boolean
}

export function AddCuratorModal({ open, onClose, onSubmit, isSubmitting }: AddCuratorModalProps) {
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [genres, setGenres] = useState('')
  const [price, setPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentHandle, setPaymentHandle] = useState('')
  const [paymentCode, setPaymentCode] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(): void {
    if (!name) return
    const parsedGenres = genres ? genres.split(/[,\/]/).map((g) => g.trim()).filter(Boolean) : undefined
    onSubmit({
      name,
      contact_name: contactName || undefined,
      email: email || undefined,
      genres: parsedGenres,
      price_per_10k: price ? parseFloat(price) : undefined,
      payment_method: paymentMethod || undefined,
      payment_handle: paymentHandle || undefined,
      payment_code: paymentCode || undefined,
      notes: notes || undefined,
    })
    setName(''); setContactName(''); setEmail(''); setGenres(''); setPrice(''); setPaymentMethod(''); setPaymentHandle(''); setPaymentCode(''); setNotes('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Curator"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!name || isSubmitting}>Add Curator</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Client / Business Name *</Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Golden Nuggets Records" />
          </div>
          <div>
            <Label optional>Contact Name</Label>
            <Input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g., Alan Maurer" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label optional>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="curator@email.com" />
          </div>
          <div>
            <Label optional>Price per 10K</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="120" step="1" />
          </div>
        </div>
        <div>
          <Label optional>Genres</Label>
          <Input type="text" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Bass, Dubstep, Riddim, Trap (comma or slash separated)" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label optional>Payment Method</Label>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              placeholder="Select..."
              fullWidth
              options={[
                { value: 'PayPal', label: 'PayPal' },
                { value: 'XRP', label: 'XRP' },
                { value: 'CashApp', label: 'CashApp' },
                { value: 'Venmo', label: 'Venmo' },
                { value: 'Zelle', label: 'Zelle' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Online', label: 'Online' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
          <div>
            <Label optional>Payment Address</Label>
            <Input type="text" value={paymentHandle} onChange={(e) => setPaymentHandle(e.target.value)} placeholder="Address, email, or URL" />
          </div>
          <div>
            <Label optional>Code / Memo</Label>
            <Input type="text" value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="e.g., XRP tag" />
          </div>
        </div>
        <div>
          <Label optional>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes about this curator" />
        </div>
      </div>
    </Modal>
  )
}
