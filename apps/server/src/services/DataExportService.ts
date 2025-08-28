import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { cacheService } from '@/config/redis';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeMetrics?: boolean;
  includeSocialProfiles?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  campaignIds?: string[];
  artistIds?: string[];
}

export interface ExportResult {
  success: boolean;
  data: string;
  filename: string;
  size: number;
  recordCount: number;
  error?: string;
}

export class DataExportService {
  /**
   * Export campaigns data
   */
  async exportCampaigns(userId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info(`Exporting campaigns for user ${userId}`, options);

      let query = supabase
        .from('campaigns')
        .select(`
          *,
          owner:users(id, email, first_name, last_name),
          campaign_artists(
            id,
            status,
            added_at,
            artist:artists(
              id,
              name,
              display_name,
              genres,
              location,
              verification_status
            )
          ),
          analytics:campaign_analytics(*),
          transactions(*)
        `)
        .eq('owner_id', userId);

      if (options.campaignIds && options.campaignIds.length > 0) {
        query = query.in('id', options.campaignIds);
      }

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end);
      }

      const { data: campaigns, error } = await query;

      if (error) {
        logger.error('Error fetching campaigns for export:', error);
        return {
          success: false,
          data: '',
          filename: '',
          size: 0,
          recordCount: 0,
          error: error.message,
        };
      }

      const processedData = this.processCampaignData(campaigns || [], options);
      const exportData = options.format === 'csv' 
        ? this.convertToCSV(processedData, 'campaigns')
        : JSON.stringify(processedData, null, 2);

      const filename = this.generateFilename('campaigns', options.format);
      
      return {
        success: true,
        data: exportData,
        filename,
        size: Buffer.byteLength(exportData, 'utf8'),
        recordCount: campaigns?.length || 0,
      };

    } catch (error) {
      logger.error('Campaign export error:', error);
      return {
        success: false,
        data: '',
        filename: '',
        size: 0,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export artists data
   */
  async exportArtists(userId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info(`Exporting artists for user ${userId}`, options);

      let query = supabase
        .from('artists')
        .select(`
          *,
          social_profiles(*),
          stream_metrics(*),
          campaign_artists(
            id,
            status,
            added_at,
            campaign:campaigns(id, name, type, status)
          )
        `)
        .eq('is_active', true);

      if (options.artistIds && options.artistIds.length > 0) {
        query = query.in('id', options.artistIds);
      }

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end);
      }

      const { data: artists, error } = await query;

      if (error) {
        logger.error('Error fetching artists for export:', error);
        return {
          success: false,
          data: '',
          filename: '',
          size: 0,
          recordCount: 0,
          error: error.message,
        };
      }

      const processedData = this.processArtistData(artists || [], options);
      const exportData = options.format === 'csv' 
        ? this.convertToCSV(processedData, 'artists')
        : JSON.stringify(processedData, null, 2);

      const filename = this.generateFilename('artists', options.format);
      
      return {
        success: true,
        data: exportData,
        filename,
        size: Buffer.byteLength(exportData, 'utf8'),
        recordCount: artists?.length || 0,
      };

    } catch (error) {
      logger.error('Artist export error:', error);
      return {
        success: false,
        data: '',
        filename: '',
        size: 0,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(userId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info(`Exporting analytics for user ${userId}`, options);

      // Get stream metrics for user's campaigns
      let query = supabase
        .from('stream_metrics')
        .select(`
          *,
          artist:artists(id, name, display_name),
          campaign_artist:campaign_artists(
            id,
            campaign:campaigns!inner(
              id,
              name,
              type,
              owner_id
            )
          )
        `)
        .eq('campaign_artist.campaign.owner_id', userId);

      if (options.dateRange) {
        query = query
          .gte('recorded_at', options.dateRange.start)
          .lte('recorded_at', options.dateRange.end);
      }

      if (options.campaignIds && options.campaignIds.length > 0) {
        query = query.in('campaign_artist.campaign.id', options.campaignIds);
      }

      const { data: metrics, error } = await query;

      if (error) {
        logger.error('Error fetching analytics for export:', error);
        return {
          success: false,
          data: '',
          filename: '',
          size: 0,
          recordCount: 0,
          error: error.message,
        };
      }

      const processedData = this.processAnalyticsData(metrics || [], options);
      const exportData = options.format === 'csv' 
        ? this.convertToCSV(processedData, 'analytics')
        : JSON.stringify(processedData, null, 2);

      const filename = this.generateFilename('analytics', options.format);
      
      return {
        success: true,
        data: exportData,
        filename,
        size: Buffer.byteLength(exportData, 'utf8'),
        recordCount: metrics?.length || 0,
      };

    } catch (error) {
      logger.error('Analytics export error:', error);
      return {
        success: false,
        data: '',
        filename: '',
        size: 0,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create database backup
   */
  async createBackup(userId: string): Promise<ExportResult> {
    try {
      logger.info(`Creating backup for user ${userId}`);

      // Export all user data
      const [campaignsResult, artistsResult, analyticsResult] = await Promise.all([
        this.exportCampaigns(userId, { format: 'json', includeMetrics: true, includeSocialProfiles: true }),
        this.exportArtists(userId, { format: 'json', includeMetrics: true, includeSocialProfiles: true }),
        this.exportAnalytics(userId, { format: 'json', includeMetrics: true })
      ]);

      if (!campaignsResult.success || !artistsResult.success || !analyticsResult.success) {
        throw new Error('Failed to export all data for backup');
      }

      // Create comprehensive backup object
      const backupData = {
        metadata: {
          userId,
          createdAt: new Date().toISOString(),
          version: '1.0',
          description: 'Complete Campaign Manager data backup',
        },
        campaigns: JSON.parse(campaignsResult.data),
        artists: JSON.parse(artistsResult.data),
        analytics: JSON.parse(analyticsResult.data),
      };

      const exportData = JSON.stringify(backupData, null, 2);
      const filename = this.generateFilename('backup', 'json');

      return {
        success: true,
        data: exportData,
        filename,
        size: Buffer.byteLength(exportData, 'utf8'),
        recordCount: campaignsResult.recordCount + artistsResult.recordCount + analyticsResult.recordCount,
      };

    } catch (error) {
      logger.error('Backup creation error:', error);
      return {
        success: false,
        data: '',
        filename: '',
        size: 0,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private processCampaignData(campaigns: any[], options: ExportOptions): any[] {
    return campaigns.map(campaign => {
      const processed: any = {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        status: campaign.status,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        budget: campaign.budget,
        targetCriteria: campaign.target_criteria,
        tags: campaign.tags,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        artistCount: campaign.campaign_artists?.length || 0,
      };

      if (options.includeMetrics && campaign.analytics) {
        processed.analytics = {
          totalStreams: campaign.analytics.total_streams,
          streamGrowth: campaign.analytics.total_stream_growth,
          totalFollowers: campaign.analytics.total_followers,
          engagementRate: campaign.analytics.engagement_rate,
          roi: campaign.analytics.roi,
          costPerStream: campaign.analytics.cost_per_stream,
        };
      }

      if (campaign.campaign_artists) {
        processed.artists = campaign.campaign_artists.map((ca: any) => ({
          id: ca.artist?.id,
          name: ca.artist?.name,
          displayName: ca.artist?.display_name,
          status: ca.status,
          addedAt: ca.added_at,
        }));
      }

      return processed;
    });
  }

  private processArtistData(artists: any[], options: ExportOptions): any[] {
    return artists.map(artist => {
      const processed: any = {
        id: artist.id,
        name: artist.name,
        displayName: artist.display_name,
        bio: artist.bio,
        genres: artist.genres,
        location: artist.location,
        profileImageUrl: artist.profile_image_url,
        verificationStatus: artist.verification_status,
        contactInfo: artist.contact_info,
        tags: artist.tags,
        isActive: artist.is_active,
        discoveredAt: artist.discovered_at,
        createdAt: artist.created_at,
        updatedAt: artist.updated_at,
      };

      if (options.includeSocialProfiles && artist.social_profiles) {
        processed.socialProfiles = artist.social_profiles.map((sp: any) => ({
          platform: sp.platform,
          username: sp.username,
          url: sp.url,
          followersCount: sp.followers_count,
          isVerified: sp.is_verified,
        }));
      }

      if (options.includeMetrics && artist.stream_metrics) {
        processed.metrics = {
          totalStreamMetrics: artist.stream_metrics.length,
          latestStreams: artist.stream_metrics
            .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
            .slice(0, 5)
            .map((sm: any) => ({
              platform: sm.platform,
              streamCount: sm.stream_count,
              followerCount: sm.follower_count,
              recordedAt: sm.recorded_at,
            }))
        };
      }

      if (artist.campaign_artists) {
        processed.campaigns = artist.campaign_artists.map((ca: any) => ({
          id: ca.campaign?.id,
          name: ca.campaign?.name,
          type: ca.campaign?.type,
          status: ca.status,
          addedAt: ca.added_at,
        }));
      }

      return processed;
    });
  }

  private processAnalyticsData(metrics: any[], options: ExportOptions): any[] {
    return metrics.map(metric => ({
      id: metric.id,
      artistId: metric.artist_id,
      artistName: metric.artist?.name,
      campaignId: metric.campaign_artist?.campaign?.id,
      campaignName: metric.campaign_artist?.campaign?.name,
      platform: metric.platform,
      trackUrl: metric.track_url,
      trackTitle: metric.track_title,
      streamCount: metric.stream_count,
      followerCount: metric.follower_count,
      likeCount: metric.like_count,
      commentCount: metric.comment_count,
      repostCount: metric.repost_count,
      metadata: metric.metadata,
      recordedAt: metric.recorded_at,
      createdAt: metric.created_at,
    }));
  }

  private convertToCSV(data: any[], type: string): string {
    if (data.length === 0) return '';

    // Define headers based on type
    let headers: string[] = [];
    
    switch (type) {
      case 'campaigns':
        headers = [
          'id', 'name', 'description', 'type', 'status', 'startDate', 'endDate',
          'budget', 'artistCount', 'totalStreams', 'streamGrowth', 'roi', 'createdAt'
        ];
        break;
      case 'artists':
        headers = [
          'id', 'name', 'displayName', 'bio', 'genres', 'location', 'verificationStatus',
          'contactEmail', 'socialProfiles', 'tags', 'isActive', 'createdAt'
        ];
        break;
      case 'analytics':
        headers = [
          'id', 'artistName', 'campaignName', 'platform', 'trackTitle', 'streamCount',
          'followerCount', 'likeCount', 'commentCount', 'recordedAt'
        ];
        break;
    }

    // Create CSV content
    const csvLines = [headers.join(',')];
    
    data.forEach(item => {
      const row = headers.map(header => {
        let value = item[header];
        
        if (value === null || value === undefined) {
          return '';
        }
        
        if (Array.isArray(value)) {
          value = value.join(';');
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }

  private generateFilename(type: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `campaign-manager-${type}-${timestamp}.${format}`;
  }
}