import express from "express";
import { verifyToken, checkCorporateOwnerRole } from "../middleware/auth.js";
import { getCorporateStats } from "../controllers/corporateStatsController.js";
import { getBillingReport, getInvoices } from "../controllers/billingController.js";

const router = express.Router();

// @route   GET /api/corporate/stats
// @desc    Get corporate dashboard stats
// @access  Private (CORPORATE only)
router.get("/stats", verifyToken, checkCorporateOwnerRole, getCorporateStats);

// @route   GET /api/corporate/billing-report
// @desc    Get monthly billing report
// @access  Private (CORPORATE only)
router.get("/billing-report", verifyToken, checkCorporateOwnerRole, getBillingReport);

// @route   GET /api/corporate/invoices
// @desc    Get invoices list
// @access  Private (CORPORATE only)
router.get("/invoices", verifyToken, checkCorporateOwnerRole, getInvoices);

export default router;
