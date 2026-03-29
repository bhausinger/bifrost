import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PipelineEntry, PipelineActivity, PipelineStage, Artist } from '@/types'

type PipelineEntryWithArtist = PipelineEntry & { artist: Artist }

export function usePipelineEntries() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_entries')
        .select('*, artist:artists(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PipelineEntryWithArtist[]
    },
  })
}

export function usePipelineActivities(entryId: string) {
  return useQuery({
    queryKey: ['pipeline-activities', entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_activities')
        .select('*')
        .eq('pipeline_entry_id', entryId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PipelineActivity[]
    },
    enabled: !!entryId,
  })
}

export function useMoveStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      entryId,
      newStage,
      note,
    }: {
      entryId: string
      newStage: PipelineStage
      note?: string
    }) => {
      const { error } = await supabase.rpc('move_pipeline_stage', {
        entry_id: entryId,
        new_stage: newStage,
        note: note ?? null,
      })
      if (error) throw error
    },
    // Optimistic update for instant drag feedback
    onMutate: async ({ entryId, newStage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] })
      const previous = queryClient.getQueryData<PipelineEntryWithArtist[]>(['pipeline'])
      queryClient.setQueryData<PipelineEntryWithArtist[]>(['pipeline'], (old) =>
        old?.map((entry) =>
          entry.id === entryId
            ? { ...entry, stage: newStage, stage_entered_at: new Date().toISOString() }
            : entry
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pipeline'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}

export function useCreatePipelineEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      artistId,
      stage = 'discovered',
      dealValue,
      packageType,
      notes,
    }: {
      artistId: string
      stage?: PipelineStage
      dealValue?: number
      packageType?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('pipeline_entries')
        .insert({
          artist_id: artistId,
          stage,
          deal_value: dealValue ?? null,
          package_type: packageType ?? null,
          notes: notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}

export function useUpdatePipelineEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<PipelineEntry> & { id: string }) => {
      const { error } = await supabase
        .from('pipeline_entries')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
