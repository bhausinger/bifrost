import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCreateTransaction, useCampaigns, useArtists } from '@/hooks/api/useFinance';

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.enum([
    'CAMPAIGN_REVENUE',
    'ARTIST_PAYMENT',
    'SUBSCRIPTION_FEE',
    'SERVICE_FEE',
    'COMMISSION',
    'OTHER_INCOME',
    'MARKETING',
    'ADVERTISING',
    'SOFTWARE_TOOLS',
    'PLATFORM_FEES',
    'ARTIST_PAYMENT_OUT',
    'OPERATIONAL_COSTS',
    'EQUIPMENT',
    'TRAVEL',
    'OTHER_EXPENSE',
  ]),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().min(1, 'Description is required'),
  paymentMethod: z.enum([
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BANK_TRANSFER',
    'PAYPAL',
    'STRIPE',
    'CRYPTO',
    'CASH',
    'CHECK',
    'OTHER',
  ]),
  transactionDate: z.string(),
  campaignId: z.string().optional(),
  artistId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  referenceId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<TransactionFormData>;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onClose,
  onSuccess,
  initialData,
}) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');

  const createTransaction = useCreateTransaction();
  const { data: campaigns } = useCampaigns();
  const { data: artists } = useArtists();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      currency: 'USD',
      transactionDate: new Date().toISOString().split('T')[0],
      tags: [],
      ...initialData,
    },
  });

  const watchedType = watch('type');
  const watchedTags = watch('tags');

  // Category options based on transaction type
  const getCategoryOptions = (type: string) => {
    const incomeCategories = [
      { value: 'CAMPAIGN_REVENUE', label: 'Campaign Revenue' },
      { value: 'ARTIST_PAYMENT', label: 'Artist Payment (Received)' },
      { value: 'SUBSCRIPTION_FEE', label: 'Subscription Fee' },
      { value: 'SERVICE_FEE', label: 'Service Fee' },
      { value: 'COMMISSION', label: 'Commission' },
      { value: 'OTHER_INCOME', label: 'Other Income' },
    ];

    const expenseCategories = [
      { value: 'MARKETING', label: 'Marketing' },
      { value: 'ADVERTISING', label: 'Advertising' },
      { value: 'SOFTWARE_TOOLS', label: 'Software & Tools' },
      { value: 'PLATFORM_FEES', label: 'Platform Fees' },
      { value: 'ARTIST_PAYMENT_OUT', label: 'Artist Payment (Paid)' },
      { value: 'OPERATIONAL_COSTS', label: 'Operational Costs' },
      { value: 'EQUIPMENT', label: 'Equipment' },
      { value: 'TRAVEL', label: 'Travel' },
      { value: 'OTHER_EXPENSE', label: 'Other Expense' },
    ];

    if (type === 'INCOME') return incomeCategories;
    if (type === 'EXPENSE') return expenseCategories;
    return [...incomeCategories, ...expenseCategories];
  };

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove));
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      await createTransaction.mutateAsync({
        ...data,
        receiptFile,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {initialData ? 'Edit Transaction' : 'Add New Transaction'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Transaction Type & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type *
              </label>
              <select
                {...register('type')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Type</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              {errors.type && (
                <p className="text-red-600 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount', { valueAsNumber: true })}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                {...register('category')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {getCategoryOptions(watchedType).map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date *
              </label>
              <Input
                type="date"
                {...register('transactionDate')}
              />
              {errors.transactionDate && (
                <p className="text-red-600 text-sm mt-1">{errors.transactionDate.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the transaction..."
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Payment Method & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Method</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="PAYPAL">PayPal</option>
                <option value="STRIPE">Stripe</option>
                <option value="CRYPTO">Cryptocurrency</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.paymentMethod && (
                <p className="text-red-600 text-sm mt-1">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                {...register('currency')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          {/* Campaign & Artist Association */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associated Campaign
              </label>
              <select
                {...register('campaignId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Campaign</option>
                {campaigns?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associated Artist
              </label>
              <select
                {...register('artistId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Artist</option>
                {artists?.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.displayName || artist.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <Input
                {...register('invoiceNumber')}
                placeholder="INV-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference ID
              </label>
              <Input
                {...register('referenceId')}
                placeholder="Transaction reference..."
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt/Document
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="text-gray-400 mb-2">📁</div>
                <p className="text-sm text-gray-600">
                  {receiptFile ? receiptFile.name : 'Click to upload receipt or document'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG up to 10MB
                </p>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`${
                watchedType === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Add Transaction')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};