import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { supabase } from '@/config/supabase';

export class CampaignController {
  async getCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Database error fetching campaigns:', error);
        return next(new AppError('Failed to fetch campaigns', 500));
      }

      res.status(200).json({
        message: 'Campaigns retrieved successfully',
        data: campaigns || []
      });
    } catch (error) {
      logger.error('Get campaigns error:', error);
      next(new AppError('Failed to get campaigns', 500));
    }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { name, description, type, startDate, endDate, budget, genre, artistName, trackLink, campaignSize } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // Generate campaign name if not provided
      const campaignName = name || (artistName ? `${artistName} - ${type} Campaign` : `${type} Campaign`);

      // Validate required fields
      if (!artistName) {
        return next(new AppError('Artist name is required', 400));
      }

      if (!type) {
        return next(new AppError('Campaign type is required', 400));
      }

      if (!genre) {
        return next(new AppError('Genre is required', 400));
      }

      if (!trackLink) {
        return next(new AppError('Track link is required', 400));
      }

      if (!campaignSize || isNaN(Number(campaignSize)) || Number(campaignSize) <= 0) {
        return next(new AppError('Campaign length (play count goal) is required', 400));
      }

      if (!startDate) {
        return next(new AppError('Start date is required', 400));
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          name: campaignName,
          description,
          type,
          status: 'DRAFT',
          start_date: new Date(startDate).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : null,
          budget: budget || null,
          target_criteria: {},
          metrics: {},
          tags: [],
          owner_id: userId,
          genre,
          artist_name: artistName,
          track_link: trackLink,
          campaign_size: Number(campaignSize)
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Database error creating campaign:', error);
        return next(new AppError('Failed to create campaign', 500));
      }

      res.status(201).json({
        message: 'Campaign created successfully',
        data: campaign
      });
    } catch (error) {
      logger.error('Create campaign error:', error);
      next(new AppError('Failed to create campaign', 500));
    }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error fetching campaign:', error);
        return next(new AppError('Failed to fetch campaign', 500));
      }

      res.status(200).json({
        message: 'Campaign retrieved successfully',
        data: campaign
      });
    } catch (error) {
      logger.error('Get campaign error:', error);
      next(new AppError('Failed to get campaign', 500));
    }
  }

  async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { name, description, type, status, startDate, endDate, budget, genre, artistName, trackLink, campaignSize } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // Build update object with only provided fields
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (status !== undefined) updateData.status = status;
      if (startDate !== undefined) updateData.start_date = new Date(startDate).toISOString();
      if (endDate !== undefined) updateData.end_date = endDate ? new Date(endDate).toISOString() : null;
      if (budget !== undefined) updateData.budget = budget;
      if (genre !== undefined) updateData.genre = genre;
      if (artistName !== undefined) updateData.artist_name = artistName;
      if (trackLink !== undefined) updateData.track_link = trackLink;
      if (campaignSize !== undefined) updateData.campaign_size = Number(campaignSize);

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', userId)
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error updating campaign:', error);
        return next(new AppError('Failed to update campaign', 500));
      }

      res.status(200).json({
        message: 'Campaign updated successfully',
        data: campaign
      });
    } catch (error) {
      logger.error('Update campaign error:', error);
      next(new AppError('Failed to update campaign', 500));
    }
  }

  async deleteCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId);

      if (error) {
        logger.error('Database error deleting campaign:', error);
        return next(new AppError('Failed to delete campaign', 500));
      }

      res.status(200).json({
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      logger.error('Delete campaign error:', error);
      next(new AppError('Failed to delete campaign', 500));
    }
  }

  async getCampaignArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // First verify the campaign belongs to the user
      const { data: _campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error checking campaign:', campaignError);
        return next(new AppError('Failed to access campaign', 500));
      }

      // Get campaign artists with artist details
      const { data: campaignArtists, error } = await supabase
        .from('campaign_artists')
        .select(`
          id,
          status,
          added_at,
          artists (
            id,
            name,
            display_name,
            bio,
            genres,
            location,
            profile_image_url,
            contact_info,
            created_at,
            updated_at
          )
        `)
        .eq('campaign_id', id);

      if (error) {
        logger.error('Database error fetching campaign artists:', error);
        return next(new AppError('Failed to fetch campaign artists', 500));
      }

      res.status(200).json({
        message: 'Campaign artists retrieved successfully',
        data: campaignArtists || []
      });
    } catch (error) {
      logger.error('Get campaign artists error:', error);
      next(new AppError('Failed to get campaign artists', 500));
    }
  }

  async addArtistToCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // campaign id
      const { artistId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!artistId) {
        return next(new AppError('Artist ID is required', 400));
      }

      // First verify the campaign belongs to the user
      const { data: _campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error checking campaign:', campaignError);
        return next(new AppError('Failed to access campaign', 500));
      }

      // Verify the artist exists
      const { data: _artist, error: artistError } = await supabase
        .from('artists')
        .select('id')
        .eq('id', artistId)
        .single();

      if (artistError) {
        if (artistError.code === 'PGRST116') {
          return next(new AppError('Artist not found', 404));
        }
        logger.error('Database error checking artist:', artistError);
        return next(new AppError('Failed to verify artist', 500));
      }

      // Check if association already exists
      const { data: existing, error: _existingError } = await supabase
        .from('campaign_artists')
        .select('id')
        .eq('campaign_id', id)
        .eq('artist_id', artistId)
        .single();

      if (existing) {
        return next(new AppError('Artist is already associated with this campaign', 400));
      }

      // Create the association
      const { data: campaignArtist, error } = await supabase
        .from('campaign_artists')
        .insert({
          campaign_id: id,
          artist_id: artistId,
          status: 'active'
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Database error adding artist to campaign:', error);
        return next(new AppError('Failed to add artist to campaign', 500));
      }

      res.status(201).json({
        message: 'Artist added to campaign successfully',
        data: campaignArtist
      });
    } catch (error) {
      logger.error('Add artist to campaign error:', error);
      next(new AppError('Failed to add artist to campaign', 500));
    }
  }

  async removeArtistFromCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, artistId } = req.params; // campaign id and artist id
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // First verify the campaign belongs to the user
      const { data: _campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error checking campaign:', campaignError);
        return next(new AppError('Failed to access campaign', 500));
      }

      // Remove the association
      const { error } = await supabase
        .from('campaign_artists')
        .delete()
        .eq('campaign_id', id)
        .eq('artist_id', artistId);

      if (error) {
        logger.error('Database error removing artist from campaign:', error);
        return next(new AppError('Failed to remove artist from campaign', 500));
      }

      res.status(200).json({
        message: 'Artist removed from campaign successfully'
      });
    } catch (error) {
      logger.error('Remove artist from campaign error:', error);
      next(new AppError('Failed to remove artist from campaign', 500));
    }
  }

  async addMultipleArtistsToCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // campaign id
      const { artistIds } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!artistIds || !Array.isArray(artistIds) || artistIds.length === 0) {
        return next(new AppError('Artist IDs array is required', 400));
      }

      // First verify the campaign belongs to the user
      const { data: _campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          return next(new AppError('Campaign not found', 404));
        }
        logger.error('Database error checking campaign:', campaignError);
        return next(new AppError('Failed to access campaign', 500));
      }

      // Verify all artists exist
      const { data: artists, error: artistsError } = await supabase
        .from('artists')
        .select('id')
        .in('id', artistIds);

      if (artistsError) {
        logger.error('Database error checking artists:', artistsError);
        return next(new AppError('Failed to verify artists', 500));
      }

      const foundArtistIds = artists.map(artist => artist.id);
      const notFoundArtists = artistIds.filter(id => !foundArtistIds.includes(id));

      if (notFoundArtists.length > 0) {
        return next(new AppError(`Artists not found: ${notFoundArtists.join(', ')}`, 404));
      }

      // Check for existing associations
      const { data: existing, error: _existingError } = await supabase
        .from('campaign_artists')
        .select('artist_id')
        .eq('campaign_id', id)
        .in('artist_id', artistIds);

      const existingArtistIds = existing?.map(ca => ca.artist_id) || [];
      const newArtistIds = artistIds.filter(id => !existingArtistIds.includes(id));

      if (newArtistIds.length === 0) {
        return next(new AppError('All artists are already associated with this campaign', 400));
      }

      // Create the associations
      const associations = newArtistIds.map(artistId => ({
        campaign_id: id,
        artist_id: artistId,
        status: 'active'
      }));

      const { data: campaignArtists, error } = await supabase
        .from('campaign_artists')
        .insert(associations)
        .select('*');

      if (error) {
        logger.error('Database error adding artists to campaign:', error);
        return next(new AppError('Failed to add artists to campaign', 500));
      }

      res.status(201).json({
        message: `${newArtistIds.length} artists added to campaign successfully`,
        data: campaignArtists,
        skipped: existingArtistIds.length > 0 ? `${existingArtistIds.length} artists were already associated` : null
      });
    } catch (error) {
      logger.error('Add multiple artists to campaign error:', error);
      next(new AppError('Failed to add artists to campaign', 500));
    }
  }
}