import { Router } from 'express';
import { FinanceController, upload } from '@/controllers/FinanceController';
import { authMiddleware } from '@/middleware/auth';

const router: Router = Router();
const financeController = new FinanceController();

// Apply auth middleware to all finance routes
router.use(authMiddleware);

// Transaction routes
router.get('/transactions', financeController.getTransactions.bind(financeController));
router.post('/transactions', upload.single('receiptFile'), financeController.createTransaction.bind(financeController));
router.put('/transactions/:id', financeController.updateTransaction.bind(financeController));
router.delete('/transactions/:id', financeController.deleteTransaction.bind(financeController));

// Statistics routes
router.get('/stats', financeController.getFinancialStats.bind(financeController));

// Report routes
router.get('/reports/pnl', financeController.getPnLReport.bind(financeController));
router.get('/reports/budget', financeController.getBudgetAnalysis.bind(financeController));
router.get('/reports/forecast', financeController.getFinancialForecast.bind(financeController));

// Support routes for form data
router.get('/campaigns', financeController.getCampaigns.bind(financeController));
router.get('/artists', financeController.getArtists.bind(financeController));

export { router as financeRoutes };