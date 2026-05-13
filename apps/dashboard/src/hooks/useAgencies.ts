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
      // Check for existing agency with same name (case-insensitive)
      const { data: existing } = await supabase
        .from('agencies')
        .select('*')
        .ilike('name', agency.name.trim())
        .maybeSingle()

      if (existing) return existing as Agency

      const { data, error } = await supabase
        .from('agencies')
        .insert({
          name: agency.name.trim(),
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

export function useDeleteAgency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Unlink artists first, then delete
      await supabase.from('artists').update({ agency_id: null }).eq('agency_id', id)
      const { error } = await supabase.from('agencies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] })
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}
