import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { DataImportService } from '@/services/DataImportService';
import { DataExportService } from '@/services/DataExportService';
import multer from 'multer';

export class DataController {
  private importService: DataImportService;
  private exportService: DataExportService;

  constructor() {
    this.importService = new DataImportService();
    this.exportService = new DataExportService();
  }

  /**
   * Generate CSV template for artist import
   */
  async getImportTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { type = 'artists' } = req.query;

      if (type !== 'artists') {
        return next(new AppError('Only artist import templates are supported currently', 400));
      }

      const template = this.importService.generateCSVTemplate();
      const filename = `campaign-manager-artists-template.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(template);

    } catch (error) {
      logger.error('Get import template error:', error);
      next(new AppError('Failed to generate import template', 500));
    }
  }

  /**
   * Validate CSV file before import
   */
  async validateImport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const validation = this.importService.validateCSVFormat(csvContent);

      if (!validation.valid) {
        return res.status(400).json({
          message: 'CSV validation failed',
          errors: validation.errors,
        });
      }

      // Parse and validate data
      const parsedData = this.importService.parseCSV(csvContent);
      
      res.status(200).json({
        message: 'CSV validation successful',
        data: {
          valid: true,
          rowCount: parsedData.length,
          preview: parsedData.slice(0, 5), // Show first 5 rows as preview
          warnings: this.generateValidationWarnings(parsedData),
        },
      });

    } catch (error) {
      logger.error('Validate import error:', error);
      next(new AppError('Failed to validate import file', 500));
    }
  }

  /**
   * Import artists from CSV
   */
  async importArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      const csvContent = req.file.buffer.toString('utf-8');
      
      // Validate CSV format
      const validation = this.importService.validateCSVFormat(csvContent);
      if (!validation.valid) {
        return res.status(400).json({
          message: 'CSV validation failed',
          errors: validation.errors,
        });
      }

      // Parse and import data
      const parsedData = this.importService.parseCSV(csvContent);
      const importResult = await this.importService.importArtists(userId, parsedData);

      const statusCode = importResult.success ? 200 : 207; // 207 = Multi-Status

      res.status(statusCode).json({
        message: importResult.success 
          ? 'Artists imported successfully' 
          : 'Import completed with some errors',
        data: importResult,
      });

    } catch (error) {
      logger.error('Import artists error:', error);
      next(new AppError('Failed to import artists', 500));
    }
  }

  /**
   * Export campaigns
   */
  async exportCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const {
        format = 'csv',
        includeMetrics = 'true',
        includeSocialProfiles = 'true',
        startDate,
        endDate,
        campaignIds,
      } = req.query;

      const options = {
        format: format as 'csv' | 'json',
        includeMetrics: includeMetrics === 'true',
        includeSocialProfiles: includeSocialProfiles === 'true',
        dateRange: startDate && endDate ? {
          start: startDate as string,
          end: endDate as string,
        } : undefined,
        campaignIds: campaignIds ? (campaignIds as string).split(',') : undefined,
      };

      const exportResult = await this.exportService.exportCampaigns(userId, options);

      if (!exportResult.success) {
        return next(new AppError(exportResult.error || 'Export failed', 500));
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);

    } catch (error) {
      logger.error('Export campaigns error:', error);
      next(new AppError('Failed to export campaigns', 500));
    }
  }

  /**
   * Export artists
   */
  async exportArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const {
        format = 'csv',
        includeMetrics = 'true',
        includeSocialProfiles = 'true',
        startDate,
        endDate,
        artistIds,
      } = req.query;

      const options = {
        format: format as 'csv' | 'json',
        includeMetrics: includeMetrics === 'true',
        includeSocialProfiles: includeSocialProfiles === 'true',
        dateRange: startDate && endDate ? {
          start: startDate as string,
          end: endDate as string,
        } : undefined,
        artistIds: artistIds ? (artistIds as string).split(',') : undefined,
      };

      const exportResult = await this.exportService.exportArtists(userId, options);

      if (!exportResult.success) {
        return next(new AppError(exportResult.error || 'Export failed', 500));
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);

    } catch (error) {
      logger.error('Export artists error:', error);
      next(new AppError('Failed to export artists', 500));
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const {
        format = 'csv',
        includeMetrics = 'true',
        startDate,
        endDate,
        campaignIds,
      } = req.query;

      const options = {
        format: format as 'csv' | 'json',
        includeMetrics: includeMetrics === 'true',
        dateRange: startDate && endDate ? {
          start: startDate as string,
          end: endDate as string,
        } : undefined,
        campaignIds: campaignIds ? (campaignIds as string).split(',') : undefined,
      };

      const exportResult = await this.exportService.exportAnalytics(userId, options);

      if (!exportResult.success) {
        return next(new AppError(exportResult.error || 'Export failed', 500));
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);

    } catch (error) {
      logger.error('Export analytics error:', error);
      next(new AppError('Failed to export analytics', 500));
    }
  }

  /**
   * Create full data backup
   */
  async createBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const backupResult = await this.exportService.createBackup(userId);

      if (!backupResult.success) {
        return next(new AppError(backupResult.error || 'Backup creation failed', 500));
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backupResult.filename}"`);
      res.send(backupResult.data);

    } catch (error) {
      logger.error('Create backup error:', error);
      next(new AppError('Failed to create backup', 500));
    }
  }

  /**
   * Get import/export status and statistics
   */
  async getDataStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // Get user's data statistics
      const stats = await this.getUserDataStats(userId);

      res.status(200).json({
        message: 'Data statistics retrieved successfully',
        data: stats,
      });

    } catch (error) {
      logger.error('Get data stats error:', error);
      next(new AppError('Failed to get data statistics', 500));
    }
  }

  // Private helper methods

  private generateValidationWarnings(data: any[]): string[] {
    const warnings: string[] = [];

    const missingEmails = data.filter(item => !item.contactEmail).length;
    if (missingEmails > 0) {
      warnings.push(`${missingEmails} artists are missing contact emails`);
    }

    const missingGenres = data.filter(item => !item.genres || item.genres.length === 0).length;
    if (missingGenres > 0) {
      warnings.push(`${missingGenres} artists are missing genre information`);
    }

    const missingSocial = data.filter(item => 
      !item.soundcloudUrl && !item.spotifyUrl && !item.instagramUrl
    ).length;
    if (missingSocial > 0) {
      warnings.push(`${missingSocial} artists have no social media links`);
    }

    return warnings;
  }

  private async getUserDataStats(userId: string): Promise<any> {
    try {
      // This would require database queries to get actual stats
      // For now, returning placeholder data
      return {
        campaigns: {
          total: 0,
          active: 0,
          completed: 0,
        },
        artists: {
          total: 0,
          withEmails: 0,
          withSocialProfiles: 0,
        },
        analytics: {
          totalMetrics: 0,
          latestMetricDate: null,
          platforms: [],
        },
        storage: {
          estimatedSize: '0 MB',
          lastBackup: null,
        },
      };
    } catch (error) {
      logger.error('Error getting user data stats:', error);
      throw error;
    }
  }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});