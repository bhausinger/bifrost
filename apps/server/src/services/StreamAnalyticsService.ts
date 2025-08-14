import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { cacheService } from '@/config/redis';
import type { 
  StreamMetric, 
  CreateStreamMetric, 
  StreamCampaignAnalytics,
  AnalyticsDashboard,
  PerformanceMetrics,
  MetricComparison,
  ROICalculation
} from '@campaign-manager/shared-types/analytics';

export class StreamAnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create a new stream metric record
   */
  async createStreamMetric(data: CreateStreamMetric): Promise<StreamMetric> {
    try {
      const recordedAt = data.recordedAt || new Date().toISOString();
      
      const { data: metric, error } = await supabase
        .from('stream_metrics')
        .insert({
          artist_id: data.artistId,
          campaign_artist_id: data.campaignArtistId,
          platform: data.platform,
          track_url: data.trackUrl,
          track_title: data.trackTitle,
          stream_count: data.streamCount,
          follower_count: data.followerCount,
          like_count: data.likeCount,
          comment_count: data.commentCount,
          repost_count: data.repostCount,
          metadata: data.metadata,
          recorded_at: recordedAt,
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Error creating stream metric:', error);
        throw new Error('Failed to create stream metric');
      }

      // Invalidate related caches
      await this.invalidateAnalyticsCaches(data.artistId, data.campaignArtistId);

      return this.mapStreamMetricFromDB(metric);
    } catch (error) {
      logger.error('StreamAnalyticsService.createStreamMetric error:', error);
      throw error;
    }
  }

  /**
   * Get stream metrics for an artist
   */
  async getArtistStreamMetrics(
    artistId: string, 
    options: {
      campaignId?: string;
      platform?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<StreamMetric[]> {
    try {
      const cacheKey = `artist_metrics:${artistId}:${JSON.stringify(options)}`;
      const cached = await cacheService.getJSON(cacheKey);
      
      if (cached) {
        return cached as StreamMetric[];
      }

      let query = supabase
        .from('stream_metrics')
        .select(`
          *,
          campaign_artist:campaign_artists(campaign_id)
        `)
        .eq('artist_id', artistId)
        .order('recorded_at', { ascending: false });

      if (options.platform) {
        query = query.eq('platform', options.platform);
      }

      if (options.campaignId) {
        query = query.eq('campaign_artists.campaign_id', options.campaignId);
      }

      if (options.startDate) {
        query = query.gte('recorded_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('recorded_at', options.endDate);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: metrics, error } = await query;

      if (error) {
        logger.error('Error fetching artist stream metrics:', error);
        throw new Error('Failed to fetch stream metrics');
      }

      const result = metrics?.map(this.mapStreamMetricFromDB) || [];
      
      // Cache for 5 minutes
      await cacheService.setJSON(cacheKey, result, this.CACHE_TTL);
      
      return result;
    } catch (error) {
      logger.error('StreamAnalyticsService.getArtistStreamMetrics error:', error);
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<StreamCampaignAnalytics | null> {
    try {
      const cacheKey = `campaign_analytics:${campaignId}`;
      const cached = await cacheService.getJSON(cacheKey);
      
      if (cached) {
        return cached as StreamCampaignAnalytics;
      }

      const { data: analytics, error } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching campaign analytics:', error);
        throw new Error('Failed to fetch campaign analytics');
      }

      if (!analytics) {
        // Generate analytics if they don't exist
        return await this.generateCampaignAnalytics(campaignId);
      }

      const result = this.mapCampaignAnalyticsFromDB(analytics);
      
      // Cache for 5 minutes
      await cacheService.setJSON(cacheKey, result, this.CACHE_TTL);
      
      return result;
    } catch (error) {
      logger.error('StreamAnalyticsService.getCampaignAnalytics error:', error);
      throw error;
    }
  }

  /**
   * Generate and update campaign analytics
   */
  async generateCampaignAnalytics(campaignId: string): Promise<StreamCampaignAnalytics> {
    try {
      // Get campaign artists and their metrics
      const { data: campaignArtists, error: artistError } = await supabase
        .from('campaign_artists')
        .select(`
          id,
          artist_id,
          stream_metrics(*)
        `)
        .eq('campaign_id', campaignId);

      if (artistError) {
        logger.error('Error fetching campaign artists:', artistError);
        throw new Error('Failed to fetch campaign artists');
      }

      // Calculate aggregate metrics
      const metrics = this.calculateAggregateMetrics(campaignArtists || []);
      
      // Get campaign budget for ROI calculation
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('budget')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        logger.error('Error fetching campaign budget:', campaignError);
      }

      const budget = campaign?.budget || 0;
      const roi = budget > 0 ? ((metrics.totalStreams * 0.01) - budget) / budget * 100 : undefined;
      const costPerStream = budget > 0 && metrics.totalStreams > 0 ? budget / metrics.totalStreams : undefined;

      const analyticsData = {
        campaign_id: campaignId,
        total_streams: metrics.totalStreams,
        total_stream_growth: metrics.streamGrowth,
        total_followers: metrics.totalFollowers,
        total_follower_growth: metrics.followerGrowth,
        engagement_rate: metrics.engagementRate,
        avg_streams_per_artist: metrics.avgStreamsPerArtist,
        top_performing_artist: metrics.topPerformingArtist,
        roi,
        cost_per_stream: costPerStream,
        conversion_rate: metrics.conversionRate,
        last_updated: new Date().toISOString(),
      };

      // Upsert analytics
      const { data: analytics, error: upsertError } = await supabase
        .from('campaign_analytics')
        .upsert(analyticsData, { onConflict: 'campaign_id' })
        .select('*')
        .single();

      if (upsertError) {
        logger.error('Error upserting campaign analytics:', upsertError);
        throw new Error('Failed to update campaign analytics');
      }

      const result = this.mapCampaignAnalyticsFromDB(analytics);
      
      // Invalidate cache
      await cacheService.del(`campaign_analytics:${campaignId}`);
      
      return result;
    } catch (error) {
      logger.error('StreamAnalyticsService.generateCampaignAnalytics error:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(userId: string): Promise<AnalyticsDashboard> {
    try {
      const cacheKey = `analytics_dashboard:${userId}`;
      const cached = await cacheService.getJSON(cacheKey);
      
      if (cached) {
        return cached as AnalyticsDashboard;
      }

      // Get user's campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('owner_id', userId);

      if (campaignError) {
        logger.error('Error fetching user campaigns:', campaignError);
        throw new Error('Failed to fetch campaigns');
      }

      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'ACTIVE').length || 0;

      // Get total artists count
      const { count: totalArtists, error: artistCountError } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (artistCountError) {
        logger.error('Error counting artists:', artistCountError);
      }

      // Get aggregate stream metrics
      const { data: streamData, error: streamError } = await supabase
        .from('stream_metrics')
        .select('stream_count')
        .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (streamError) {
        logger.error('Error fetching stream data:', streamError);
      }

      const totalStreams = streamData?.reduce((sum, metric) => sum + metric.stream_count, 0) || 0;

      // Calculate stream growth (simplified - comparing last 15 days vs previous 15 days)
      const last15Days = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentStreams } = await supabase
        .from('stream_metrics')
        .select('stream_count')
        .gte('recorded_at', last15Days);

      const recentStreamCount = recentStreams?.reduce((sum, metric) => sum + metric.stream_count, 0) || 0;
      const streamGrowth = totalStreams > 0 ? ((recentStreamCount / (totalStreams - recentStreamCount)) - 1) * 100 : 0;

      // Get top campaigns
      const topCampaigns = await this.getTopCampaigns(userId, 5);
      
      // Get top artists
      const topArtists = await this.getTopArtists(userId, 5);
      
      // Get recent metrics
      const recentMetrics = await this.getRecentMetrics(userId, 10);

      const dashboard: AnalyticsDashboard = {
        totalCampaigns,
        activeCampaigns,
        totalArtists: totalArtists || 0,
        totalStreams,
        streamGrowth,
        topCampaigns,
        topArtists,
        recentMetrics,
      };

      // Cache for 10 minutes
      await cacheService.setJSON(cacheKey, dashboard, 600);
      
      return dashboard;
    } catch (error) {
      logger.error('StreamAnalyticsService.getAnalyticsDashboard error:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics over time
   */
  async getPerformanceMetrics(
    campaignId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `performance_metrics:${campaignId}:${period}`;
      const cached = await cacheService.getJSON(cacheKey);
      
      if (cached) {
        return cached as PerformanceMetrics;
      }

      const dateRange = this.getDateRangeForPeriod(period);
      
      const { data: metrics, error } = await supabase
        .from('stream_metrics')
        .select(`
          *,
          campaign_artist:campaign_artists!inner(campaign_id)
        `)
        .eq('campaign_artist.campaign_id', campaignId)
        .gte('recorded_at', dateRange.start)
        .lte('recorded_at', dateRange.end)
        .order('recorded_at');

      if (error) {
        logger.error('Error fetching performance metrics:', error);
        throw new Error('Failed to fetch performance metrics');
      }

      // Group metrics by date and aggregate
      const groupedData = this.groupMetricsByDate(metrics || [], period);
      
      const result: PerformanceMetrics = {
        period,
        data: groupedData,
      };

      // Cache for 1 hour
      await cacheService.setJSON(cacheKey, result, 3600);
      
      return result;
    } catch (error) {
      logger.error('StreamAnalyticsService.getPerformanceMetrics error:', error);
      throw error;
    }
  }

  /**
   * Calculate ROI for a campaign
   */
  async calculateROI(campaignId: string): Promise<ROICalculation> {
    try {
      // Get campaign budget and expenses
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('campaign_id', campaignId);

      if (transactionError) {
        logger.error('Error fetching campaign transactions:', transactionError);
        throw new Error('Failed to fetch campaign transactions');
      }

      const expenses = transactions?.filter(t => t.type === 'EXPENSE') || [];
      const income = transactions?.filter(t => t.type === 'INCOME') || [];
      
      const totalCost = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalRevenue = income.reduce((sum, revenue) => sum + revenue.amount, 0);

      // Get stream metrics for the campaign
      const analytics = await this.getCampaignAnalytics(campaignId);
      const totalStreams = analytics?.totalStreams || 0;

      // Estimate revenue if not tracked (simplified calculation)
      const estimatedRevenue = totalRevenue > 0 ? totalRevenue : totalStreams * 0.01; // $0.01 per stream estimate
      
      const roi = totalCost > 0 ? ((estimatedRevenue - totalCost) / totalCost) * 100 : 0;
      const costPerStream = totalStreams > 0 ? totalCost / totalStreams : 0;
      const conversionRate = totalStreams > 0 ? (estimatedRevenue / totalStreams) * 100 : 0;

      // Breakdown by category
      const categoryBreakdown = this.calculateCategoryBreakdown(expenses);

      return {
        campaignId,
        totalCost,
        totalStreams,
        estimatedRevenue,
        roi,
        costPerStream,
        conversionRate,
        breakdownByCategory: categoryBreakdown,
      };
    } catch (error) {
      logger.error('StreamAnalyticsService.calculateROI error:', error);
      throw error;
    }
  }

  // Private helper methods

  private mapStreamMetricFromDB(metric: any): StreamMetric {
    return {
      id: metric.id,
      artistId: metric.artist_id,
      campaignArtistId: metric.campaign_artist_id,
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
    };
  }

  private mapCampaignAnalyticsFromDB(analytics: any): StreamCampaignAnalytics {
    return {
      id: analytics.id,
      campaignId: analytics.campaign_id,
      totalStreams: analytics.total_streams,
      totalStreamGrowth: analytics.total_stream_growth,
      totalFollowers: analytics.total_followers,
      totalFollowerGrowth: analytics.total_follower_growth,
      engagementRate: analytics.engagement_rate,
      avgStreamsPerArtist: analytics.avg_streams_per_artist,
      topPerformingArtist: analytics.top_performing_artist,
      roi: analytics.roi,
      costPerStream: analytics.cost_per_stream,
      conversionRate: analytics.conversion_rate,
      lastUpdated: analytics.last_updated,
      createdAt: analytics.created_at,
    };
  }

  private calculateAggregateMetrics(campaignArtists: any[]) {
    let totalStreams = 0;
    let totalFollowers = 0;
    let totalEngagement = 0;
    let artistStreamCounts: { [artistId: string]: number } = {};

    for (const artist of campaignArtists) {
      if (artist.stream_metrics) {
        for (const metric of artist.stream_metrics) {
          totalStreams += metric.stream_count || 0;
          totalFollowers += metric.follower_count || 0;
          totalEngagement += (metric.like_count || 0) + (metric.comment_count || 0) + (metric.repost_count || 0);
          
          if (!artistStreamCounts[artist.artist_id]) {
            artistStreamCounts[artist.artist_id] = 0;
          }
          artistStreamCounts[artist.artist_id] += metric.stream_count || 0;
        }
      }
    }

    const artistCount = campaignArtists.length;
    const avgStreamsPerArtist = artistCount > 0 ? totalStreams / artistCount : 0;
    const engagementRate = totalStreams > 0 ? (totalEngagement / totalStreams) * 100 : 0;

    // Find top performing artist
    const topPerformingArtist = Object.entries(artistStreamCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return {
      totalStreams,
      totalFollowers,
      avgStreamsPerArtist,
      engagementRate,
      topPerformingArtist,
      streamGrowth: 0, // Would need historical data to calculate
      followerGrowth: 0, // Would need historical data to calculate
      conversionRate: 0, // Would need conversion tracking
    };
  }

  private async getTopCampaigns(userId: string, limit: number) {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        campaign_analytics(total_streams, total_stream_growth, roi)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching top campaigns:', error);
      return [];
    }

    return campaigns?.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      totalStreams: campaign.campaign_analytics?.[0]?.total_streams || 0,
      streamGrowth: campaign.campaign_analytics?.[0]?.total_stream_growth || 0,
      roi: campaign.campaign_analytics?.[0]?.roi,
    })) || [];
  }

  private async getTopArtists(userId: string, limit: number) {
    // This would need to be refined based on user's artist relationships
    const { data: artists, error } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        stream_metrics(stream_count, follower_count, like_count, comment_count)
      `)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      logger.error('Error fetching top artists:', error);
      return [];
    }

    return artists?.map(artist => {
      const metrics = artist.stream_metrics || [];
      const totalStreams = metrics.reduce((sum: number, m: any) => sum + (m.stream_count || 0), 0);
      const followerCount = Math.max(...metrics.map((m: any) => m.follower_count || 0), 0);
      const totalEngagement = metrics.reduce((sum: number, m: any) => 
        sum + (m.like_count || 0) + (m.comment_count || 0), 0);
      const engagementRate = totalStreams > 0 ? (totalEngagement / totalStreams) * 100 : 0;

      return {
        id: artist.id,
        name: artist.name,
        totalStreams,
        followerCount,
        engagementRate,
      };
    }).sort((a, b) => b.totalStreams - a.totalStreams) || [];
  }

  private async getRecentMetrics(userId: string, limit: number): Promise<StreamMetric[]> {
    // Get recent metrics from user's campaigns
    const { data: metrics, error } = await supabase
      .from('stream_metrics')
      .select(`
        *,
        campaign_artist:campaign_artists!inner(
          campaign:campaigns!inner(owner_id)
        )
      `)
      .eq('campaign_artist.campaign.owner_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching recent metrics:', error);
      return [];
    }

    return metrics?.map(this.mapStreamMetricFromDB) || [];
  }

  private getDateRangeForPeriod(period: string) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(end.getDate() - 7); // Last 7 days
        break;
      case 'week':
        start.setDate(end.getDate() - 28); // Last 4 weeks
        break;
      case 'month':
        start.setMonth(end.getMonth() - 6); // Last 6 months
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 12); // Last 4 quarters
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 3); // Last 3 years
        break;
      default:
        start.setDate(end.getDate() - 30); // Default to last 30 days
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  private groupMetricsByDate(metrics: any[], period: string) {
    const grouped: { [date: string]: { streams: number; followers: number; engagement: number } } = {};

    for (const metric of metrics) {
      const date = this.formatDateForPeriod(new Date(metric.recorded_at), period);
      
      if (!grouped[date]) {
        grouped[date] = { streams: 0, followers: 0, engagement: 0 };
      }

      grouped[date].streams += metric.stream_count || 0;
      grouped[date].followers += metric.follower_count || 0;
      grouped[date].engagement += (metric.like_count || 0) + (metric.comment_count || 0);
    }

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      ...data,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private formatDateForPeriod(date: Date, period: string): string {
    switch (period) {
      case 'day':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return String(date.getFullYear());
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private calculateCategoryBreakdown(expenses: any[]) {
    const categoryTotals: { [category: string]: number } = {};
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    for (const expense of expenses) {
      const category = expense.category || 'OTHER';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    }

    return Object.entries(categoryTotals).map(([category, cost]) => ({
      category,
      cost,
      percentage: totalAmount > 0 ? (cost / totalAmount) * 100 : 0,
    }));
  }

  private async invalidateAnalyticsCaches(artistId: string, campaignArtistId?: string) {
    // Invalidate artist-specific caches
    const artistCacheKeys = await cacheService.keys(`artist_metrics:${artistId}:*`);
    for (const key of artistCacheKeys) {
      await cacheService.del(key);
    }

    // Invalidate campaign caches if campaign artist is specified
    if (campaignArtistId) {
      // Get campaign ID
      const { data: campaignArtist } = await supabase
        .from('campaign_artists')
        .select('campaign_id')
        .eq('id', campaignArtistId)
        .single();

      if (campaignArtist) {
        await cacheService.del(`campaign_analytics:${campaignArtist.campaign_id}`);
        await cacheService.del(`performance_metrics:${campaignArtist.campaign_id}:*`);
      }
    }

    // Invalidate dashboard caches (would need user context for more specific invalidation)
    const dashboardKeys = await cacheService.keys('analytics_dashboard:*');
    for (const key of dashboardKeys) {
      await cacheService.del(key);
    }
  }
}