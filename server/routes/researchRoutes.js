const express = require('express');
const { protect } = require('../middleware/auth');
const { discoverCompanyUrls, fetchText, fetchRobotsTxt } = require('../services/researchService');

const router = express.Router();

router.get('/discover', protect, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ message: 'A company website URL is required.' });
  }

  try {
    const robotsTxt = await fetchRobotsTxt(url);
    const discovered = await discoverCompanyUrls(url, {
      fetchFn: async (targetUrl, options) => fetchText(targetUrl, options),
      robotsTxt,
      maxDepth: 3,
    });

    return res.json({ ok: true, urls: discovered });
  } catch (error) {
    return res.status(502).json({
      message: 'Failed to discover company information.',
      error: error.message,
    });
  }
});

router.get('/fetch', protect, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ message: 'A URL is required.' });
  }

  try {
    const html = await fetchText(url, { timeoutMs: 15000, retries: 2 });
    return res.json({ ok: true, html });
  } catch (error) {
    return res.status(502).json({
      message: 'Could not fetch the target page.',
      error: error.message,
    });
  }
});

module.exports = router;
