import { z } from 'zod';
import { BaseEntitySchema } from './common';

// Currency enum
export const CurrencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY'
]);
export type Currency = z.infer<typeof CurrencySchema>;

// Transaction type
export const TransactionTypeSchema = z.enum([
  'income',
  'expense',
  'transfer'
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Transaction category
export const TransactionCategorySchema = z.enum([
  // Income categories
  'campaign_revenue',
  'artist_payment',
  'subscription_fee',
  'service_fee',
  'commission',
  'other_income',
  
  // Expense categories
  'marketing',
  'advertising',
  'software_tools',
  'platform_fees',
  'artist_payment_out',
  'operational_costs',
  'equipment',
  'travel',
  'other_expense'
]);
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;

// Transaction status
export const TransactionStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded'
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

// Payment method
export const PaymentMethodSchema = z.enum([
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stripe',
  'crypto',
  'cash',
  'check',
  'other'
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// Money amount schema
export const MoneyAmountSchema = z.object({
  amount: z.number(),
  currency: CurrencySchema,
  displayAmount: z.string().optional(), // Formatted display string
});
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;

// Transaction schema
export const TransactionSchema = BaseEntitySchema.extend({
  type: TransactionTypeSchema,
  category: TransactionCategorySchema,
  amount: MoneyAmountSchema,
  description: z.string(),
  status: TransactionStatusSchema,
  paymentMethod: PaymentMethodSchema,
  transactionDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  invoiceNumber: z.string().optional(),
  referenceId: z.string().optional(), // External payment reference
  campaignId: z.string().optional(),
  artistId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    type: z.string(),
  })).default([]),
  ownerId: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

// Budget schema
export const BudgetSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  totalAmount: MoneyAmountSchema,
  spentAmount: MoneyAmountSchema,
  remainingAmount: MoneyAmountSchema,
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  categories: z.array(z.object({
    category: TransactionCategorySchema,
    budgetAmount: MoneyAmountSchema,
    spentAmount: MoneyAmountSchema,
  })),
  campaignId: z.string().optional(),
  isActive: z.boolean().default(true),
  ownerId: z.string(),
});
export type Budget = z.infer<typeof BudgetSchema>;

// Invoice schema
export const InvoiceSchema = BaseEntitySchema.extend({
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  clientAddress: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: MoneyAmountSchema,
    totalPrice: MoneyAmountSchema,
  })),
  subtotal: MoneyAmountSchema,
  taxAmount: MoneyAmountSchema,
  taxRate: z.number().default(0),
  totalAmount: MoneyAmountSchema,
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  paidDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  ownerId: z.string(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// Financial report schemas
export const ProfitLossReportSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  revenue: z.object({
    total: MoneyAmountSchema,
    byCategory: z.array(z.object({
      category: TransactionCategorySchema,
      amount: MoneyAmountSchema,
      percentage: z.number(),
    })),
    trend: z.array(z.object({
      date: z.string().datetime(),
      amount: MoneyAmountSchema,
    })),
  }),
  expenses: z.object({
    total: MoneyAmountSchema,
    byCategory: z.array(z.object({
      category: TransactionCategorySchema,
      amount: MoneyAmountSchema,
      percentage: z.number(),
    })),
    trend: z.array(z.object({
      date: z.string().datetime(),
      amount: MoneyAmountSchema,
    })),
  }),
  netProfit: MoneyAmountSchema,
  profitMargin: z.number(),
  generatedAt: z.string().datetime(),
});
export type ProfitLossReport = z.infer<typeof ProfitLossReportSchema>;

export const CashFlowReportSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  openingBalance: MoneyAmountSchema,
  closingBalance: MoneyAmountSchema,
  totalInflow: MoneyAmountSchema,
  totalOutflow: MoneyAmountSchema,
  netCashFlow: MoneyAmountSchema,
  monthlyFlow: z.array(z.object({
    month: z.string(),
    inflow: MoneyAmountSchema,
    outflow: MoneyAmountSchema,
    netFlow: MoneyAmountSchema,
  })),
  generatedAt: z.string().datetime(),
});
export type CashFlowReport = z.infer<typeof CashFlowReportSchema>;

// Request schemas
export const CreateTransactionRequestSchema = z.object({
  type: TransactionTypeSchema,
  category: TransactionCategorySchema,
  amount: MoneyAmountSchema,
  description: z.string().min(1),
  paymentMethod: PaymentMethodSchema,
  transactionDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  invoiceNumber: z.string().optional(),
  referenceId: z.string().optional(),
  campaignId: z.string().optional(),
  artistId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;

export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema.partial().extend({
  status: TransactionStatusSchema.optional(),
});
export type UpdateTransactionRequest = z.infer<typeof UpdateTransactionRequestSchema>;

export const CreateBudgetRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  totalAmount: MoneyAmountSchema,
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  categories: z.array(z.object({
    category: TransactionCategorySchema,
    budgetAmount: MoneyAmountSchema,
  })),
  campaignId: z.string().optional(),
});
export type CreateBudgetRequest = z.infer<typeof CreateBudgetRequestSchema>;

export const UpdateBudgetRequestSchema = CreateBudgetRequestSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateBudgetRequest = z.infer<typeof UpdateBudgetRequestSchema>;

export const GenerateReportRequestSchema = z.object({
  type: z.enum(['profit_loss', 'cash_flow', 'expense_breakdown', 'revenue_analysis']),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  filters: z.object({
    categories: z.array(TransactionCategorySchema).optional(),
    campaigns: z.array(z.string()).optional(),
    artists: z.array(z.string()).optional(),
  }).optional(),
  format: z.enum(['json', 'pdf', 'csv']).default('json'),
});
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;