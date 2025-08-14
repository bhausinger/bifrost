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
}