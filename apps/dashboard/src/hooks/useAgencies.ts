import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Agency } from '@/types'

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name')
      if (error) throw error
      return data as Agency[]
    },
  })
}

export function useCreateAgency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (agency: {
      name: string
      email?: string
      contact_name?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('agencies')
        .insert({
          name: agency.name,
          email: agency.email ?? null,
          contact_name: agency.contact_name ?? null,
          notes: agency.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Agency
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
    },
  })
}

export function useUpdateAgency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Agency> & { id: string }) => {
      const { error } = await supabase.from('agencies').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
    },
  })
}
