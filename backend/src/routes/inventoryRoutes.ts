import express from 'express';
import { EstateController } from '../controllers/EstateController.js';
import { PlotController } from '../controllers/PlotController.js';
import { SaleController } from '../controllers/SaleController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// --- INVENTORY / ESTATES ROUTES ---
router.post('/estates', authenticateToken, upload.fields([{ name: 'searchDocument', maxCount: 1 }, { name: 'siteLayout', maxCount: 1 }]), EstateController.createEstate);
router.get('/estates', authenticateToken, EstateController.getEstates);
router.put('/estates/:id', authenticateToken, upload.fields([{ name: 'searchDocument', maxCount: 1 }, { name: 'siteLayout', maxCount: 1 }]), EstateController.updateEstate);
router.delete('/estates/:id', authenticateToken, EstateController.deleteEstate);
router.post('/estates/secure-pdf-stream', authenticateToken, EstateController.streamSecurePdf);

// --- INVENTORY / PLOTS ROUTES ---
router.post('/estates/:estateId/plots/bulk', authenticateToken, PlotController.generatePlots);
router.post('/estates/:estateId/plots/bulk-import', authenticateToken, PlotController.importBulkPlots);
router.post('/estates/:estateId/plots/manual', authenticateToken, PlotController.addLegacyPlot);
router.get('/estates/:estateId/plots', authenticateToken, PlotController.getEstatePlots);
router.get('/plots/available', authenticateToken, PlotController.getAvailablePlots);
router.put('/plots/:plotId', authenticateToken, PlotController.updatePlot);
router.put('/plots/:plotId/toggle-cp', authenticateToken, PlotController.toggleCornerPiece);
router.get('/plots/:plotId/history', authenticateToken, PlotController.getPlotHistory);
router.put('/estates/:estateId/plots/bulk-price', authenticateToken, PlotController.updateBulkPlotPrices);

// --- SALES & PAYMENTS ROUTES ---
router.post('/sales', authenticateToken, SaleController.createSale);
router.post('/sales/legacy-onboard', authenticateToken, SaleController.onboardLegacySales);
router.get('/leads/:leadId/sales', authenticateToken, SaleController.getLeadSales);
router.post('/sales/:saleId/payments', authenticateToken, upload.array('proofs', 10), SaleController.recordPayment);
router.get('/payments/pending', authenticateToken, SaleController.getPendingPayments);
router.get('/payments/processed', authenticateToken, SaleController.getProcessedPayments);
router.put('/payments/:paymentId/status', authenticateToken, SaleController.updatePaymentStatus);
router.patch('/sales/:saleId/plot', authenticateToken, SaleController.assignPlotNumber);
router.post('/sales/:saleId/exchange', authenticateToken, SaleController.exchangePlot);
router.put('/payments/:paymentId/bank-confirm', authenticateToken, SaleController.bankConfirmPayment);
router.post('/payments/:paymentId/messages', authenticateToken, SaleController.addPaymentMessage);
router.get('/payments/:paymentId/messages', authenticateToken, SaleController.getPaymentMessages);
router.put('/sales/:id/cancel', authenticateToken, SaleController.cancelSale);

// --- LEGACY SALE REQUESTS ROUTES ---
import { LegacySaleRequestController } from '../controllers/LegacySaleRequestController.js';
router.post('/legacy-sale-requests', authenticateToken, LegacySaleRequestController.createRequest);
router.get('/legacy-sale-requests/sent', authenticateToken, LegacySaleRequestController.getSentRequests);
router.get('/legacy-sale-requests/received', authenticateToken, LegacySaleRequestController.getReceivedRequests);
router.put('/legacy-sale-requests/:requestId/approve', authenticateToken, LegacySaleRequestController.approveRequest);
router.put('/legacy-sale-requests/:requestId/reject', authenticateToken, LegacySaleRequestController.rejectRequest);

export default router;
