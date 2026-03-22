import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface BlockedTerm {
  id: string
  term: string
  type: 'email_domain' | 'profile_name'
  created_at: string
}

export function useBlockedTerms() {
  return useQuery({
    queryKey: ['blocked-terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_terms')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BlockedTerm[]
    },
  })
}

export function useAddBlockedTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ term, type }: { term: string; type: 'email_domain' | 'profile_name' }) => {
      const { data: user } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('blocked_terms')
        .insert({ term: term.toLowerCase().trim(), type, created_by: user.user?.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-terms'] }),
  })
}

export function useDeleteBlockedTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_terms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-terms'] }),
  })
}
