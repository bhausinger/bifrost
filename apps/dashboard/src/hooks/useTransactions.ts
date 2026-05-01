import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { Transaction } from '@/types'

export function useTransactions(): ReturnType<typeof useQuery<Transaction[]>> {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useCreateTransaction(): ReturnType<
  typeof useMutation<
    Database['public']['Tables']['transactions']['Row'],
    Error,
    Database['public']['Tables']['transactions']['Insert']
  >
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      tx: Database['public']['Tables']['transactions']['Insert'],
    ): Promise<Database['public']['Tables']['transactions']['Row']> => {
      const { data, error } = await supabase.from('transactions').insert(tx).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
