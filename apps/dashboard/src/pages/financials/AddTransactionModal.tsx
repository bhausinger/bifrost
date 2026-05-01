import { useState } from 'react'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { Modal, Button, Input, Label, Select } from '@/components/ui'

const CATEGORY_OPTIONS = [
  { value: 'client_payment', label: 'Client Payment' },
  { value: 'curator_payment', label: 'Curator Payment' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'cashapp', label: 'CashApp' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'bank', label: 'Bank Transfer' },
]

type AddTransactionModalProps = {
  open: boolean
  onClose: () => void
}

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps): JSX.Element {
  const createTransaction = useCreateTransaction()
  const [formType, setFormType] = useState<'income' | 'expense'>('income')
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('client_payment')
  const [formPaymentMethod, setFormPaymentMethod] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  function handleClose(): void {
    onClose()
    setFormAmount('')
    setFormDescription('')
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Transaction"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              createTransaction.mutate(
                {
                  type: formType,
                  amount: parseFloat(formAmount),
                  description: formDescription || null,
                  category: formCategory || null,
                  payment_method: formPaymentMethod || null,
                  transaction_date: formDate || new Date().toISOString().split('T')[0]!,
                },
                { onSuccess: handleClose },
              )
            }
            disabled={!formAmount}
          >
            Add {formType === 'income' ? 'Income' : 'Expense'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setFormType(t)
                setFormCategory(t === 'income' ? 'client_payment' : 'curator_payment')
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                formType === t
                  ? t === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label optional>Description</Label>
          <Input
            type="text"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="What's this for?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select
              fullWidth
              value={formCategory}
              onChange={setFormCategory}
              options={CATEGORY_OPTIONS}
            />
          </div>
          <div>
            <Label optional>Payment Method</Label>
            <Select
              fullWidth
              value={formPaymentMethod}
              onChange={setFormPaymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              placeholder="Select..."
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
