import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import type { Artist } from '@campaign-manager/shared-types/artist';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  duplicates: number;
  imported: any[];
}

export interface ArtistImportData {
  name: string;
  displayName?: string;
  bio?: string;
  genres?: string[];
  location?: string;
  profileImageUrl?: string;
  contactEmail?: string;
  soundcloudUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  followerCount?: number;
  isVerified?: boolean;
  tags?: string[];
}

export class DataImportService {
  /**
   * Parse CSV content and return structured data
   */
  parseCSV(csvContent: string): ArtistImportData[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: ArtistImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue; // Skip empty lines

      const row: any = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          row[this.normalizeHeader(header)] = values[index];
        }
      });

      // Process specific field types
      const processedRow = this.processImportRow(row);
      if (processedRow.name) { // Only include rows with a name
        data.push(processedRow);
      }
    }

    return data;
  }

  /**
   * Import artists from CSV data
   */
  async importArtists(userId: string, csvData: ArtistImportData[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: csvData.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duplicates: 0,
      imported: [],
    };

    logger.info(`Starting import of ${csvData.length} artists for user ${userId}`);

    for (let i = 0; i < csvData.length; i++) {
      const artistData = csvData[i];
      
      try {
        // Validate required fields
        if (!artistData.name || artistData.name.trim() === '') {
          result.errors.push({
            row: i + 2, // +2 because array is 0-indexed and we skip header
            error: 'Artist name is required',
            data: artistData,
          });
          result.errorCount++;
          continue;
        }

        // Check for duplicates
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id, name')
          .eq('name', artistData.name.trim())
          .single();

        if (existingArtist) {
          result.duplicates++;
          logger.info(`Skipping duplicate artist: ${artistData.name}`);
          continue;
        }

        // Prepare artist data for insertion
        const insertData = {
          name: artistData.name.trim(),
          display_name: artistData.displayName?.trim() || artistData.name.trim(),
          bio: artistData.bio?.trim() || null,
          genres: this.processGenres(artistData.genres),
          location: artistData.location?.trim() || null,
          profile_image_url: artistData.profileImageUrl?.trim() || null,
          contact_info: this.buildContactInfo(artistData),
          metrics: {
            follower_count: artistData.followerCount || 0,
          },
          tags: this.processTags(artistData.tags),
          verification_status: artistData.isVerified ? 'VERIFIED' : 'UNVERIFIED',
          is_active: true,
          discovered_at: new Date().toISOString(),
        };

        // Insert artist
        const { data: newArtist, error: insertError } = await supabase
          .from('artists')
          .insert(insertData)
          .select('*')
          .single();

        if (insertError) {
          result.errors.push({
            row: i + 2,
            error: `Database error: ${insertError.message}`,
            data: artistData,
          });
          result.errorCount++;
          continue;
        }

        // Create social profiles if URLs are provided
        await this.createSocialProfiles(newArtist.id, artistData);

        result.imported.push(newArtist);
        result.successCount++;
        
        logger.info(`Successfully imported artist: ${artistData.name}`);

      } catch (error) {
        result.errors.push({
          row: i + 2,
          error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: artistData,
        });
        result.errorCount++;
        logger.error(`Error importing artist ${artistData.name}:`, error);
      }
    }

    result.success = result.errorCount === 0;
    
    logger.info(`Import completed: ${result.successCount} success, ${result.errorCount} errors, ${result.duplicates} duplicates`);
    
    return result;
  }

  /**
   * Validate CSV format and return validation errors
   */
  validateCSVFormat(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const lines = csvContent.trim().split('\n');
      
      if (lines.length < 2) {
        errors.push('CSV must contain at least a header row and one data row');
        return { valid: false, errors };
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Check for required columns
      const normalizedHeaders = headers.map(h => this.normalizeHeader(h));
      
      if (!normalizedHeaders.includes('name')) {
        errors.push('CSV must contain a "name" column for artist names');
      }

      // Check for data rows
      let validDataRows = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length > 0 && values.some(v => v.trim() !== '')) {
          validDataRows++;
        }
      }

      if (validDataRows === 0) {
        errors.push('CSV must contain at least one row with data');
      }

      // Validate maximum size (10MB)
      const sizeInMB = new Blob([csvContent]).size / (1024 * 1024);
      if (sizeInMB > 10) {
        errors.push('CSV file size must be less than 10MB');
      }

      // Validate reasonable row count (max 10,000 rows)
      if (lines.length > 10001) { // +1 for header
        errors.push('CSV must contain fewer than 10,000 data rows');
      }

    } catch (error) {
      errors.push(`Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate CSV template with example data
   */
  generateCSVTemplate(): string {
    const headers = [
      'name',
      'displayName',
      'bio',
      'genres',
      'location',
      'profileImageUrl',
      'contactEmail',
      'soundcloudUrl',
      'spotifyUrl',
      'instagramUrl',
      'twitterUrl',
      'websiteUrl',
      'followerCount',
      'isVerified',
      'tags'
    ];

    const exampleRows = [
      [
        'Example Artist',
        'Example Artist Official',
        'Electronic music producer from Los Angeles',
        'Electronic,House,Techno',
        'Los Angeles, CA',
        'https://example.com/avatar.jpg',
        'artist@example.com',
        'https://soundcloud.com/example-artist',
        'https://open.spotify.com/artist/example',
        'https://instagram.com/example-artist',
        'https://twitter.com/example-artist',
        'https://example-artist.com',
        '25000',
        'false',
        'electronic,producer,los-angeles'
      ],
      [
        'Another Artist',
        '',
        'Indie rock band from Portland',
        'Rock,Indie,Alternative',
        'Portland, OR',
        '',
        'band@anotherartist.com',
        'https://soundcloud.com/another-artist',
        '',
        'https://instagram.com/another-artist',
        '',
        '',
        '15000',
        'true',
        'rock,band,portland'
      ]
    ];

    const csvLines = [headers.join(',')];
    exampleRows.forEach(row => {
      csvLines.push(row.map(cell => `"${cell}"`).join(','));
    });

    return csvLines.join('\n');
  }

  // Private helper methods

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i - 1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else if (char !== '"' || inQuotes) {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/url$/, 'Url')
      .replace(/email$/, 'Email');
  }

  private processImportRow(row: any): ArtistImportData {
    return {
      name: row.name,
      displayName: row.displayname || row.displayName,
      bio: row.bio,
      genres: this.processGenres(row.genres),
      location: row.location,
      profileImageUrl: row.profileimageurl || row.profileImageUrl,
      contactEmail: row.contactemail || row.contactEmail,
      soundcloudUrl: row.soundcloudurl || row.soundcloudUrl,
      spotifyUrl: row.spotifyurl || row.spotifyUrl,
      instagramUrl: row.instagramurl || row.instagramUrl,
      twitterUrl: row.twitterurl || row.twitterUrl,
      websiteUrl: row.websiteurl || row.websiteUrl,
      followerCount: this.parseNumber(row.followercount || row.followerCount),
      isVerified: this.parseBoolean(row.isverified || row.isVerified),
      tags: this.processTags(row.tags),
    };
  }

  private processGenres(genres: any): string[] {
    if (!genres) return [];
    if (Array.isArray(genres)) return genres;
    if (typeof genres === 'string') {
      return genres.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
    return [];
  }

  private processTags(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    }
    return [];
  }

  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', 'yes', '1', 'verified'].includes(value.toLowerCase());
    }
    return false;
  }

  private buildContactInfo(artistData: ArtistImportData): any {
    const contactInfo: any = {};
    
    if (artistData.contactEmail) {
      contactInfo.email = artistData.contactEmail;
      contactInfo.hasEmail = true;
    }
    
    const socialLinks: string[] = [];
    if (artistData.soundcloudUrl) socialLinks.push(artistData.soundcloudUrl);
    if (artistData.spotifyUrl) socialLinks.push(artistData.spotifyUrl);
    if (artistData.instagramUrl) socialLinks.push(artistData.instagramUrl);
    if (artistData.twitterUrl) socialLinks.push(artistData.twitterUrl);
    if (artistData.websiteUrl) socialLinks.push(artistData.websiteUrl);
    
    if (socialLinks.length > 0) {
      contactInfo.socialLinks = socialLinks;
    }

    return Object.keys(contactInfo).length > 0 ? contactInfo : null;
  }

  private async createSocialProfiles(artistId: string, artistData: ArtistImportData): Promise<void> {
    const profiles = [];

    if (artistData.soundcloudUrl) {
      profiles.push({
        artist_id: artistId,
        platform: 'SOUNDCLOUD',
        username: this.extractUsernameFromUrl(artistData.soundcloudUrl, 'soundcloud'),
        url: artistData.soundcloudUrl,
        followers_count: artistData.followerCount || 0,
        is_verified: artistData.isVerified || false,
      });
    }

    if (artistData.spotifyUrl) {
      profiles.push({
        artist_id: artistId,
        platform: 'SPOTIFY',
        username: this.extractUsernameFromUrl(artistData.spotifyUrl, 'spotify'),
        url: artistData.spotifyUrl,
        followers_count: 0,
        is_verified: artistData.isVerified || false,
      });
    }

    if (artistData.instagramUrl) {
      profiles.push({
        artist_id: artistId,
        platform: 'INSTAGRAM',
        username: this.extractUsernameFromUrl(artistData.instagramUrl, 'instagram'),
        url: artistData.instagramUrl,
        followers_count: 0,
        is_verified: artistData.isVerified || false,
      });
    }

    if (artistData.twitterUrl) {
      profiles.push({
        artist_id: artistId,
        platform: 'TWITTER',
        username: this.extractUsernameFromUrl(artistData.twitterUrl, 'twitter'),
        url: artistData.twitterUrl,
        followers_count: 0,
        is_verified: artistData.isVerified || false,
      });
    }

    if (profiles.length > 0) {
      const { error } = await supabase
        .from('social_profiles')
        .insert(profiles);

      if (error) {
        logger.error(`Error creating social profiles for artist ${artistId}:`, error);
      }
    }
  }

  private extractUsernameFromUrl(url: string, platform: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      switch (platform) {
        case 'soundcloud':
          return pathname.split('/').filter(p => p)[0] || 'unknown';
        case 'spotify':
          return pathname.split('/').pop() || 'unknown';
        case 'instagram':
        case 'twitter':
          return pathname.replace('/', '') || 'unknown';
        default:
          return 'unknown';
      }
    } catch {
      return 'unknown';
    }
  }
}