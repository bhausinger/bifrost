import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { supabase } from '@/config/supabase';
import { ConversationalAIService } from '@/services/ConversationalAIService';
import { cacheService } from '@/config/redis';
import { webSocketService } from '@/services/WebSocketService';

export class ArtistController {
  private aiService: ConversationalAIService;

  constructor() {
    this.aiService = new ConversationalAIService();
  }
  async getArtists(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('🔍 Starting getArtists request');
      
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      logger.info(`User info - ID: ${userId}, Email: ${userEmail}`);

      if (!userId) {
        logger.warn('No user ID provided');
        return next(new AppError('User ID required', 400));
      }

      // Check cache first
      const cacheKey = `artists:${userId}`;
      const cachedArtists = await cacheService.getJSON(cacheKey);
      
      if (cachedArtists) {
        logger.info(`✅ Returning ${Array.isArray(cachedArtists) ? cachedArtists.length : 0} cached artists for user ${userId}`);
        return res.status(200).json({ 
          message: 'Artists fetched successfully (cached)', 
          data: cachedArtists || [],
          count: Array.isArray(cachedArtists) ? cachedArtists.length : 0
        });
      }

      logger.info('📊 Attempting to fetch artists from database...');
      
      // Query only columns that exist in the current database
      const { data: artists, error } = await supabase
        .from('artists')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Database error fetching artists:', error);
        logger.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({
          error: 'Database query failed',
          details: error.message,
          hint: error.hint || 'No additional information'
        });
      }

      // Cache the results for 5 minutes
      await cacheService.setJSON(cacheKey, artists || [], 300);

      logger.info(`✅ Successfully fetched ${artists?.length || 0} artists for user ${userId}`);
      
      res.status(200).json({ 
        message: 'Artists fetched successfully', 
        data: artists || [],
        count: artists?.length || 0
      });
    } catch (error) {
      logger.error('💥 Unexpected error in getArtists:', error);
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  async createArtist(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ message: 'Create artist endpoint - not implemented yet', data: req.body });
    } catch (error) {
      logger.error('Create artist error:', error);
      next(new AppError('Failed to create artist', 500));
    }
  }

  async getArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      res.status(200).json({ message: `Get artist ${id} endpoint - not implemented yet` });
    } catch (error) {
      logger.error('Get artist error:', error);
      next(new AppError('Failed to get artist', 500));
    }
  }

  async updateArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      res.status(200).json({ message: `Update artist ${id} endpoint - not implemented yet`, data: req.body });
    } catch (error) {
      logger.error('Update artist error:', error);
      next(new AppError('Failed to update artist', 500));
    }
  }

  async deleteArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      res.status(200).json({ message: `Delete artist ${id} endpoint - not implemented yet` });
    } catch (error) {
      logger.error('Delete artist error:', error);
      next(new AppError('Failed to delete artist', 500));
    }
  }

  async discoverArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { 
        query: searchQuery, 
        genre, 
        source = 'soundcloud', 
        limit = 20,
        anchorArtist,
        searchType = 'keyword'
      } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!searchQuery) {
        return next(new AppError('Search query is required', 400));
      }

      // Log the search
      await supabase
        .from('discovery_searches')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          search_type: searchType === 'similar_to_anchor' ? 'similar_artist_search' : 'keyword_search',
          search_params: { genre, source, limit, anchorArtist, searchType }
        });

      // Mock data for now - replace with actual scraper results
      let mockArtists = [];
      
      if (searchType === 'similar_to_anchor') {
        // Generate artists similar to the anchor artist
        const anchorName = anchorArtist || 'Unknown';
        mockArtists = [
          {
            id: `mock-${Date.now()}-1`,
            name: `${anchorName}-inspired Producer`,
            soundcloud_url: `https://soundcloud.com/${anchorName.toLowerCase().replace(/\s+/g, '-')}-inspired-producer`,
            avatar_url: 'https://via.placeholder.com/150x150/9B59B6/FFFFFF?text=S1',
            follower_count: Math.floor(Math.random() * 40000) + 5000,
            track_count: Math.floor(Math.random() * 120) + 15,
            location: 'Amsterdam, Netherlands',
            description: `Electronic artist heavily influenced by ${anchorName}'s style and sound design`,
            is_verified: Math.random() > 0.7,
            genre: genre || 'Electronic',
            discovery_source: `${source}_similar_to_${anchorName.toLowerCase().replace(/\s+/g, '_')}`,
            tags: [genre?.toLowerCase() || 'electronic', 'similar', anchorName.toLowerCase(), 'inspired']
          },
          {
            id: `mock-${Date.now()}-2`,
            name: `${anchorName} Vibes`,
            soundcloud_url: `https://soundcloud.com/${anchorName.toLowerCase().replace(/\s+/g, '-')}-vibes`,
            avatar_url: 'https://via.placeholder.com/150x150/E67E22/FFFFFF?text=S2',
            follower_count: Math.floor(Math.random() * 25000) + 3000,
            track_count: Math.floor(Math.random() * 80) + 8,
            location: 'Montreal, Canada',
            description: `Up-and-coming artist creating music in the same vein as ${anchorName}`,
            is_verified: Math.random() > 0.8,
            genre: genre || 'Electronic',
            discovery_source: `${source}_similar_to_${anchorName.toLowerCase().replace(/\s+/g, '_')}`,
            tags: [genre?.toLowerCase() || 'electronic', 'similar', 'emerging', anchorName.toLowerCase()]
          },
          {
            id: `mock-${Date.now()}-3`,
            name: `Next ${anchorName}`,
            soundcloud_url: `https://soundcloud.com/next-${anchorName.toLowerCase().replace(/\s+/g, '-')}`,
            avatar_url: 'https://via.placeholder.com/150x150/27AE60/FFFFFF?text=S3',
            follower_count: Math.floor(Math.random() * 35000) + 8000,
            track_count: Math.floor(Math.random() * 95) + 12,
            location: 'Stockholm, Sweden',
            description: `Producer with a sound palette remarkably similar to ${anchorName}, perfect for similar campaigns`,
            is_verified: Math.random() > 0.6,
            genre: genre || 'Electronic',
            discovery_source: `${source}_similar_to_${anchorName.toLowerCase().replace(/\s+/g, '_')}`,
            tags: [genre?.toLowerCase() || 'electronic', 'similar', 'comparable', anchorName.toLowerCase()]
          }
        ];
      } else {
        // Original keyword search
        mockArtists = [
          {
            id: `mock-${Date.now()}-1`,
            name: `${searchQuery} Artist 1`,
            soundcloud_url: `https://soundcloud.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-artist-1`,
            avatar_url: 'https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=A1',
            follower_count: Math.floor(Math.random() * 50000) + 1000,
            track_count: Math.floor(Math.random() * 100) + 5,
            location: 'Los Angeles, CA',
            description: `${genre || 'Electronic'} music producer with a focus on ${searchQuery.toLowerCase()} sounds`,
            is_verified: Math.random() > 0.8,
            genre: genre || 'Electronic',
            discovery_source: `${source}_search`,
            tags: [genre?.toLowerCase() || 'electronic', 'music', 'producer', searchQuery.toLowerCase()]
          },
          {
            id: `mock-${Date.now()}-2`,
            name: `${searchQuery} Artist 2`,
            soundcloud_url: `https://soundcloud.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-artist-2`,
            avatar_url: 'https://via.placeholder.com/150x150/4ECDC4/FFFFFF?text=A2',
            follower_count: Math.floor(Math.random() * 30000) + 500,
            track_count: Math.floor(Math.random() * 80) + 3,
            location: 'Berlin, Germany',
            description: `Experimental ${genre || 'electronic'} artist exploring ${searchQuery.toLowerCase()} themes`,
            is_verified: Math.random() > 0.9,
            genre: genre || 'Electronic',
            discovery_source: `${source}_search`,
            tags: [genre?.toLowerCase() || 'electronic', 'experimental', 'digital', searchQuery.toLowerCase()]
          },
          {
            id: `mock-${Date.now()}-3`,
            name: `${searchQuery} Collective`,
            soundcloud_url: `https://soundcloud.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-collective`,
            avatar_url: 'https://via.placeholder.com/150x150/45B7D1/FFFFFF?text=A3',
            follower_count: Math.floor(Math.random() * 20000) + 2000,
            track_count: Math.floor(Math.random() * 60) + 10,
            location: 'London, UK',
            description: `Music collective specializing in ${genre || 'electronic'} and ${searchQuery.toLowerCase()} fusion`,
            is_verified: Math.random() > 0.7,
            genre: genre || 'Electronic',
            discovery_source: `${source}_search`,
            tags: [genre?.toLowerCase() || 'electronic', 'collective', 'fusion', searchQuery.toLowerCase()]
          }
        ];
      }

      res.status(200).json({
        message: 'Artists discovered successfully',
        data: mockArtists,
        search_info: {
          query: searchQuery,
          source,
          genre,
          searchType,
          anchorArtist: searchType === 'similar_to_anchor' ? anchorArtist : undefined,
          results_count: mockArtists.length
        }
      });
    } catch (error) {
      logger.error('Discover artists error:', error);
      next(new AppError('Failed to discover artists', 500));
    }
  }

  async saveDiscoveredArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const {
        name,
        soundcloud_url,
        genre,
        follower_count,
        track_count,
        location,
        description,
        avatar_url,
        is_verified,
        discovery_source,
        tags,
        contactInfo
      } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!name) {
        return next(new AppError('Artist name is required', 400));
      }

      // Check if artist already exists
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('name', name)
        .single();

      if (existingArtist) {
        return res.status(200).json({
          message: 'Artist already saved',
          data: existingArtist
        });
      }

      const { data: artist, error } = await supabase
        .from('artists')
        .insert({
          name,
          soundcloud_url,
          genre,
          follower_count: Number(follower_count) || 0,
          track_count: Number(track_count) || 0,
          location,
          description,
          avatar_url,
          is_verified: Boolean(is_verified),
          discovery_source,
          tags: Array.isArray(tags) ? tags : [],
          // Save contact info if available (this includes email data)
          contact_info: contactInfo || null
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Database error saving artist:', error);
        return next(new AppError('Failed to save artist', 500));
      }

      res.status(201).json({
        message: 'Artist saved successfully',
        data: artist
      });
    } catch (error) {
      logger.error('Save discovered artist error:', error);
      next(new AppError('Failed to save discovered artist', 500));
    }
  }

  async startAIConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { prompt } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!prompt) {
        return next(new AppError('Initial prompt is required', 400));
      }

      // Create session ID based on user and timestamp
      const sessionId = `${userId}-${Date.now()}`;

      // Gather exclusion context from database
      const exclusionContext = await this.buildExclusionContext(userId);

      // Start conversation with AI
      const response = await this.aiService.startConversation(sessionId, prompt, exclusionContext);

      res.status(200).json({
        sessionId,
        exclusionContext,
        ...response
      });
    } catch (error) {
      logger.error('Start AI conversation error:', error);
      next(new AppError('Failed to start AI conversation', 500));
    }
  }

  async continueAIConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { sessionId, message } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!sessionId || !message) {
        return next(new AppError('Session ID and message are required', 400));
      }

      // Verify session belongs to user
      if (!sessionId.startsWith(userId)) {
        return next(new AppError('Invalid session', 403));
      }

      // Continue conversation
      const response = await this.aiService.continueConversation(sessionId, message);

      res.status(200).json({
        sessionId,
        ...response
      });
    } catch (error) {
      logger.error('Continue AI conversation error:', error);
      next(new AppError('Failed to continue AI conversation', 500));
    }
  }

  async scrapeArtistEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { artistNames, mode = 'auto', useWebSocket = true } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!artistNames || !Array.isArray(artistNames) || artistNames.length === 0) {
        return next(new AppError('Artist names array is required', 400));
      }

      // Limit to reasonable number of artists to avoid overload
      if (artistNames.length > 200) {
        return next(new AppError('Too many artists requested (max 200)', 400));
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`Smart scraping ${artistNames.length} artists for user ${userId} (mode: ${mode}, task: ${taskId})`);

      // Start WebSocket progress tracking
      if (useWebSocket) {
        webSocketService.startScrapingProgress(taskId, userId, artistNames);
      }

      try {
        // For large batches, use streaming approach
        if (artistNames.length > 5 && useWebSocket) {
          // Process in smaller batches with progress updates
          const results: any[] = [];
          const batchSize = 3;
          
          for (let i = 0; i < artistNames.length; i += batchSize) {
            const batch = artistNames.slice(i, i + batchSize);
            const currentArtist = batch[0];
            
            // Update progress before processing batch
            webSocketService.updateScrapingProgress(
              taskId, 
              i, 
              currentArtist
            );

            // Process batch
            const scraperResponse = await fetch('http://localhost:9999/api/soundcloud/smart/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                artist_names: batch,
                mode: mode,
                max_concurrent: Math.min(3, batch.length)
              })
            });

            if (!scraperResponse.ok) {
              throw new Error(`Scraper service error: ${scraperResponse.statusText}`);
            }

            const batchData = await scraperResponse.json();
            
            // Transform and add batch results
            const transformedResults = batchData.results.map((result: any) => ({
              artistName: result.artist_name,
              hasEmail: result.emails.length > 0,
              emails: result.emails,
              phoneNumbers: result.phone_numbers,
              socialHandles: result.social_handles,
              managementContacts: result.management_contacts,
              bookingContacts: result.booking_contacts,
              websites: result.websites,
              confidenceScore: result.confidence_score,
              platformsUsed: result.platforms_used,
              playwrightUsed: result.playwright_used,
              scrapingTime: result.scraping_time,
              success: result.success,
              error: result.error_message
            }));

            results.push(...transformedResults);

            // Update progress after batch completion
            webSocketService.updateScrapingProgress(
              taskId, 
              i + batch.length, 
              batch[batch.length - 1],
              transformedResults[transformedResults.length - 1]
            );
          }

          // Complete progress tracking
          webSocketService.completeScrapingProgress(taskId, results);

          const successfulCount = results.filter(r => r.success).length;
          
          res.status(200).json({
            message: 'Smart email scraping completed',
            taskId,
            mode: mode,
            results,
            summary: {
              total_artists: artistNames.length,
              successful: successfulCount,
              withEmails: successfulCount,
              withoutEmails: artistNames.length - successfulCount,
              total_emails: results.reduce((sum, r) => sum + (r.emails?.length || 0), 0),
              total_phones: results.reduce((sum, r) => sum + (r.phoneNumbers?.length || 0), 0),
              playwright_triggered: results.filter(r => r.playwrightUsed).length
            }
          });
        } else {
          // Small batch - process all at once
          const scraperResponse = await fetch('http://localhost:9999/api/soundcloud/smart/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              artist_names: artistNames,
              mode: mode,
              max_concurrent: Math.min(3, artistNames.length)
            })
          });

          if (!scraperResponse.ok) {
            throw new Error(`Scraper service error: ${scraperResponse.statusText}`);
          }

          const scraperData = await scraperResponse.json();

          // Transform results for frontend compatibility
          const results = scraperData.results.map((result: any) => ({
            artistName: result.artist_name,
            hasEmail: result.emails.length > 0,
            emails: result.emails,
            phoneNumbers: result.phone_numbers,
            socialHandles: result.social_handles,
            managementContacts: result.management_contacts,
            bookingContacts: result.booking_contacts,
            websites: result.websites,
            confidenceScore: result.confidence_score,
            platformsUsed: result.platforms_used,
            playwrightUsed: result.playwright_used,
            scrapingTime: result.scraping_time,
            success: result.success,
            error: result.error_message
          }));

          if (useWebSocket) {
            webSocketService.completeScrapingProgress(taskId, results);
          }

          res.status(200).json({
            message: 'Smart email scraping completed',
            taskId,
            mode: scraperData.mode,
            results,
            summary: {
              ...scraperData.summary,
              withEmails: scraperData.summary.successful,
              withoutEmails: scraperData.summary.total_artists - scraperData.summary.successful
            }
          });
        }
      } catch (scraperError) {
        if (useWebSocket) {
          webSocketService.errorScrapingProgress(taskId, String(scraperError));
        }
        throw scraperError;
      }
    } catch (error) {
      logger.error('Smart scrape artist emails error:', error);
      next(new AppError('Failed to scrape artist emails', 500));
    }
  }

  async saveArtistsWithEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { artists } = req.body;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!artists || !Array.isArray(artists)) {
        return next(new AppError('Artists array is required', 400));
      }

      // Only process artists that have emails
      const artistsWithEmails = artists.filter(artist => artist.hasEmail && artist.contactInfo?.email);

      if (artistsWithEmails.length === 0) {
        return res.status(400).json({
          message: 'No artists with valid emails provided',
          savedArtists: [],
          errors: [],
          summary: { total: 0, saved: 0, errors: 0 }
        });
      }

      logger.info(`Processing ${artistsWithEmails.length} artists with emails for user ${userId}`);

      const savedArtists = [];
      const errors = [];

      for (const artistData of artistsWithEmails) {
        try {
          // Check if artist already exists
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('id, name')
            .eq('name', artistData.name)
            .single();

          if (existingArtist) {
            logger.info(`Artist ${artistData.name} already exists, skipping`);
            errors.push({ artist: artistData.name, error: 'Artist already exists' });
            continue;
          }

          // Save artist with email information
          const { data: savedArtist, error } = await supabase
            .from('artists')
            .insert({
              name: artistData.name,
              display_name: artistData.name,
              bio: artistData.reason || `Artist discovered through email scraping`,
              genres: [artistData.genre || 'Electronic'],
              discovery_source: 'email_scraper',
              tags: artistData.similar_to || [],
              contact_info: {
                email: artistData.contactInfo.email,
                socialLinks: artistData.contactInfo.socialLinks || [],
                website: artistData.contactInfo.website || null,
                hasEmail: true,
                emailStatus: artistData.emailStatus || 'found'
              },
              // Add SoundCloud URL if available in social links
              ...(artistData.contactInfo.socialLinks?.find((link: string) => link.includes('soundcloud.com')) && {
                // Note: We'd need to add soundcloud_url field to artists table, or store it in contact_info
              })
            })
            .select('*')
            .single();

          if (error) {
            logger.error(`Error saving artist ${artistData.name}:`, error);
            errors.push({ artist: artistData.name, error: error.message });
          } else {
            savedArtists.push(savedArtist);
            logger.info(`Successfully saved artist: ${artistData.name} with email: ${artistData.contactInfo.email}`);
          }
        } catch (artistError) {
          logger.error(`Error processing artist ${artistData.name}:`, artistError);
          errors.push({ artist: artistData.name, error: 'Processing failed' });
        }
      }

      res.status(200).json({
        message: `Saved ${savedArtists.length} artists with emails successfully`,
        savedArtists,
        errors,
        summary: {
          total: artistsWithEmails.length,
          saved: savedArtists.length,
          errors: errors.length
        }
      });
    } catch (error) {
      logger.error('Save artists with emails error:', error);
      next(new AppError('Failed to save artists with emails', 500));
    }
  }

  private async buildExclusionContext(userId: string): Promise<any> {
    try {
      logger.info(`Building exclusion context for user ${userId}`);
      
      // Get existing saved artists
      const { data: savedArtists } = await supabase
        .from('artists')
        .select('name')
        .limit(1000); // Reasonable limit to avoid memory issues

      // Get artists from campaigns  
      const { data: campaignArtists } = await supabase
        .from('campaigns')
        .select('artist_name')
        .not('artist_name', 'is', null)
        .limit(1000);

      // TODO: Get contacted artists from outreach records
      // This would require an outreach/contacts table to track who has been contacted
      const { data: contactedArtists } = await supabase
        .from('outreach_contacts')
        .select('artist_name')
        .eq('user_id', userId)
        .limit(1000);

      const context = {
        existing_artists: savedArtists?.map(a => a.name).filter(Boolean) || [],
        campaign_artists: campaignArtists?.map(c => c.artist_name).filter(Boolean) || [],
        contacted_artists: contactedArtists?.map(c => c.artist_name).filter(Boolean) || []
      };

      logger.info(`Exclusion context built: ${context.existing_artists.length} existing, ${context.campaign_artists.length} in campaigns, ${context.contacted_artists.length} contacted`);
      
      return context;
    } catch (error) {
      logger.error('Error building exclusion context:', error);
      // Return empty context on error rather than failing the whole request
      return {
        existing_artists: [],
        campaign_artists: [],
        contacted_artists: []
      };
    }
  }

}