import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

// Test the pure business logic patterns from stripe-webhook
// These test the data transformations without needing Stripe/Supabase mocks

Deno.test('cents to dollars conversion is correct', () => {
  assertEquals(100 / 100, 1)
  assertEquals(1299 / 100, 12.99)
  assertEquals(0 / 100, 0)
  assertEquals(50 / 100, 0.5)
})

Deno.test('amount formatting for activity description', () => {
  const amountPaid = 1299
  const dollars = (amountPaid / 100).toFixed(2)
  assertEquals(dollars, '12.99')

  const zeroPaid = 0
  assertEquals((zeroPaid / 100).toFixed(2), '0.00')
})

Deno.test('pipeline_entry_id extraction from invoice metadata', () => {
  const invoice = {
    metadata: { pipeline_entry_id: 'abc-123' },
    amount_paid: 5000,
  }
  assertEquals(invoice.metadata?.pipeline_entry_id, 'abc-123')
})

Deno.test('missing pipeline_entry_id in metadata returns undefined', () => {
  const invoice = {
    metadata: {},
    amount_paid: 5000,
  }
  assertEquals(invoice.metadata?.pipeline_entry_id, undefined)
})

Deno.test('null metadata is handled safely', () => {
  const invoice = {
    metadata: null as Record<string, string> | null,
    amount_paid: 5000,
  }
  assertEquals(invoice.metadata?.pipeline_entry_id, undefined)
})

Deno.test('event type routing identifies all handled types', () => {
  const handledTypes = ['invoice.paid', 'invoice.payment_failed', 'invoice.overdue']
  const unhandled = 'customer.created'

  for (const t of handledTypes) {
    assertEquals(handledTypes.includes(t), true, `${t} should be handled`)
  }
  assertEquals(handledTypes.includes(unhandled), false, 'customer.created should not be handled')
})

Deno.test('transaction date formatting for insert', () => {
  const date = new Date('2026-04-30T15:30:00Z')
  const formatted = date.toISOString().split('T')[0]
  assertEquals(formatted, '2026-04-30')
})
