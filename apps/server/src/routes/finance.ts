import { Router } from 'express';
import { FinanceController } from '@/controllers/FinanceController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();
const financeController = new FinanceController();

// Apply auth middleware to all finance routes
router.use(authMiddleware);

router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);
router.get('/transactions/:id', financeController.getTransaction);
router.put('/transactions/:id', financeController.updateTransaction);
router.delete('/transactions/:id', financeController.deleteTransaction);
router.get('/reports/pnl', financeController.getPnLReport);
router.get('/reports/revenue', financeController.getRevenueReport);
router.get('/reports/expenses', financeController.getExpenseReport);

export { router as financeRoutes };