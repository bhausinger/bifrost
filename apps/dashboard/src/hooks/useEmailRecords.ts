import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type EmailRecord = Database['public']['Tables']['email_records']['Row']

const EMAIL_RECORDS_LIMIT = 50

export function useEmailRecords(): ReturnType<typeof useQuery<EmailRecord[]>> {
  return useQuery({
    queryKey: ['email-records'],
    queryFn: async (): Promise<EmailRecord[]> => {
      const { data, error } = await supabase
        .from('email_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(EMAIL_RECORDS_LIMIT)
      if (error) throw error
      return data
    },
  })
}
