const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// Helper to ensure controller middleware exists before attaching to route
const asyncHandler = (fn) => (req, res, next) => {
  if (typeof fn !== 'function') {
    return res.status(500).json({
      success: false,
      message: 'Route handler is not defined in analysisController',
    });
  }
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/analysis/:reportId - Trigger gene analysis for report
router.post('/:reportId', asyncHandler(analysisController.runAnalysis));

// GET /api/analysis/:reportId - Get latest analysis for report
router.get(
  '/:reportId',
  asyncHandler(analysisController.getAnalysisByReportId || analysisController.getAnalysis)
);

// PUT /api/analysis/:analysisId/review - Update physician review status
router.put(
  '/:analysisId/review',
  asyncHandler(analysisController.updateReviewStatus || analysisController.reviewAnalysis)
);

module.exports = router;