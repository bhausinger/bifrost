import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { FinancialService } from '@/services/FinancialService';
import multer from 'multer';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export class FinanceController {
  private financialService: FinancialService;

  constructor() {
    this.financialService = new FinancialService();
  }

  /**
   * Get transactions for the authenticated user
   */
  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const {
        type,
        category,
        status,
        campaignId,
        artistId,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      const filters = {
        type: type as string,
        category: category as string,
        status: status as string,
        campaignId: campaignId as string,
        artistId: artistId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const transactions = await this.financialService.getTransactions(userId, filters);

      res.status(200).json({
        message: 'Transactions retrieved successfully',
        data: transactions,
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      next(new AppError('Failed to get transactions', 500));
    }
  }

  /**
   * Create a new transaction
   */
  async createTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const transactionData = req.body;
      const receiptFile = req.file;

      const transaction = await this.financialService.createTransaction(
        userId,
        transactionData,
        receiptFile
      );

      res.status(201).json({
        message: 'Transaction created successfully',
        data: transaction,
      });
    } catch (error) {
      logger.error('Create transaction error:', error);
      next(new AppError('Failed to create transaction', 500));
    }
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { id } = req.params;
      const updateData = req.body;

      const transaction = await this.financialService.updateTransaction(userId, id, updateData);

      res.status(200).json({
        message: 'Transaction updated successfully',
        data: transaction,
      });
    } catch (error) {
      logger.error('Update transaction error:', error);
      next(new AppError('Failed to update transaction', 500));
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { id } = req.params;

      await this.financialService.deleteTransaction(userId, id);

      res.status(200).json({
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      logger.error('Delete transaction error:', error);
      next(new AppError('Failed to delete transaction', 500));
    }
  }

  /**
   * Get financial statistics
   */
  async getFinancialStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? {
        start: startDate as string,
        end: endDate as string,
      } : undefined;

      const stats = await this.financialService.getFinancialStats(userId, dateRange);

      res.status(200).json({
        message: 'Financial statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Get financial stats error:', error);
      next(new AppError('Failed to get financial statistics', 500));
    }
  }

  /**
   * Generate Profit & Loss report
   */
  async getPnLReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return next(new AppError('Start date and end date are required', 400));
      }

      const dateRange = {
        start: startDate as string,
        end: endDate as string,
      };

      const report = await this.financialService.generatePLReport(userId, dateRange);

      res.status(200).json({
        message: 'P&L report generated successfully',
        data: report,
      });
    } catch (error) {
      logger.error('Get P&L report error:', error);
      next(new AppError('Failed to generate P&L report', 500));
    }
  }

  /**
   * Get budget analysis
   */
  async getBudgetAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const analysis = await this.financialService.getBudgetAnalysis(userId);

      res.status(200).json({
        message: 'Budget analysis retrieved successfully',
        data: analysis,
      });
    } catch (error) {
      logger.error('Get budget analysis error:', error);
      next(new AppError('Failed to get budget analysis', 500));
    }
  }

  /**
   * Generate financial forecast
   */
  async getFinancialForecast(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const { months } = req.query;
      const forecastMonths = months ? parseInt(months as string) : 6;

      const forecast = await this.financialService.generateForecast(userId, forecastMonths);

      res.status(200).json({
        message: 'Financial forecast generated successfully',
        data: forecast,
      });
    } catch (error) {
      logger.error('Get financial forecast error:', error);
      next(new AppError('Failed to generate financial forecast', 500));
    }
  }

  /**
   * Get campaigns for transaction association
   */
  async getCampaigns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // This would typically come from a campaign service
      // For now, return empty array until we integrate properly
      const campaigns: any[] = [];

      res.status(200).json({
        message: 'Campaigns retrieved successfully',
        data: campaigns,
      });
    } catch (error) {
      logger.error('Get campaigns error:', error);
      next(new AppError('Failed to get campaigns', 500));
    }
  }

  /**
   * Get artists for transaction association
   */
  async getArtists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // This would typically come from an artist service
      // For now, return empty array until we integrate properly
      const artists: any[] = [];

      res.status(200).json({
        message: 'Artists retrieved successfully',
        data: artists,
      });
    } catch (error) {
      logger.error('Get artists error:', error);
      next(new AppError('Failed to get artists', 500));
    }
  }
}

// Multer configuration for receipt uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and PDF files are allowed'));
    }
  },
});