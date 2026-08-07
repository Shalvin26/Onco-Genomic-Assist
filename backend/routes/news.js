const express = require('express');
const cron = require('node-cron');
const MedicalNews = require('../models/MedicalNews');
const { syncMedicalNews } = require('../services/newsService');

const router = express.Router();

// 1. GET /api/news - Fetch paginated medical news with optional search & tag filters
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, tag } = req.query;

    // Build filter query
    const query = {};

    if (tag && tag !== 'All') {
      query.tag = tag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6; // Defaults to 6 items per page
    const skip = (pageNum - 1) * limitNum;

    const [news, totalItems] = await Promise.all([
      MedicalNews.find(query)
        .sort({ timestamp: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum),
      MedicalNews.countDocuments(query),
    ]);

    res.json({
      news,
      totalItems,
      currentPage: pageNum,
      totalPages: Math.ceil(totalItems / limitNum) || 1,
    });
  } catch (err) {
    console.error('[GET NEWS ERROR]', err);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// 2. POST /api/news/sync - Non-blocking manual sync
router.post('/sync', async (req, res) => {
  try {
    // Run sync asynchronously in background
    syncMedicalNews()
      .then((allNews) => console.log(`[SYNC COMPLETE] ${allNews ? allNews.length : 0} items updated.`))
      .catch((err) => console.error('[SYNC ERROR]', err.message));

    // Return first page of cached news immediately
    const currentNews = await MedicalNews.find()
      .sort({ timestamp: -1, _id: -1 })
      .limit(6);

    res.json({ message: 'Sync started in background', news: currentNews });
  } catch (err) {
    console.error('[SYNC TRIGGER ERROR]', err);
    res.status(500).json({ message: 'Sync trigger failed' });
  }
});

// 3. Background Cron: Auto-syncs every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('[CRON] Automated Medical News sync running...');
  syncMedicalNews();
});

module.exports = router;