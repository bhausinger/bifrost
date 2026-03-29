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
      // Get old stage for activity log
      const { data: entry } = await supabase
        .from('pipeline_entries')
        .select('stage')
        .eq('id', entryId)
        .single()
      const oldStage = entry?.stage ?? 'unknown'

      // Try RPC first
      const { error: rpcError } = await supabase.rpc('move_pipeline_stage', {
        entry_id: entryId,
        new_stage: newStage,
        note: note ?? null,
      })

      if (rpcError) {
        // Fallback: direct update
        const { error: updateError } = await supabase
          .from('pipeline_entries')
          .update({
            stage: newStage,
            stage_entered_at: new Date().toISOString(),
            contacted_at: newStage === 'contacted' ? new Date().toISOString() : undefined,
            responded_at: newStage === 'responded' ? new Date().toISOString() : undefined,
            paid_at: newStage === 'paid' ? new Date().toISOString() : undefined,
            completed_at: newStage === 'completed' ? new Date().toISOString() : undefined,
          })
          .eq('id', entryId)
        if (updateError) throw updateError
      }

      // Insert activity log directly if RPC failed (RPC handles its own activity insert)
      if (rpcError) {
        await supabase.from('pipeline_activities').insert({
          pipeline_entry_id: entryId,
          type: 'stage_change',
          description: `Moved from ${oldStage} to ${newStage}`,
          metadata: { old_stage: oldStage, new_stage: newStage, note: note ?? null },
        })
      }
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
      queryClient.invalidateQueries({ queryKey: ['pipeline-activities'] })
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
