const express = require('express');
const { protect } = require('../middleware/auth');
const {
  runGenerationPipeline,
  normalizeRequirement,
} = require('../services/generationService');

const router = express.Router();

router.post('/generate-kit', protect, async (req, res) => {
  const {
    name,
    role,
    jobDescription,
    companyUrl,
    requirements = [],
    daysRequested = 7,
    minutesPerSession = 45,
  } = req.body;

  try {
    const sourceRequirements = requirements.length
      ? requirements.map(normalizeRequirement)
      : [];

    const pipeline = await runGenerationPipeline({
      jobDescription: jobDescription || sourceRequirements.map((item) => item.label).join('. '),
      companyUrl,
      category: role || 'general',
      daysRequested,
      minutesPerSession,
      discoverCompanyUrlsFn: async () => [],
    });

    const kit = {
      ...pipeline.kit,
      name: name || `${role || 'Interview'} prep kit`,
      user: req.user?._id || pipeline.kit.user,
      requirements: sourceRequirements.length ? sourceRequirements : pipeline.requirements,
      questions: pipeline.questions,
      schedule: pipeline.schedule,
    };

    const validation = pipeline.validation;
    if (!validation.valid) {
      return res.status(400).json({ message: 'Generated kit failed validation', errors: validation.errors });
    }

    return res.json({ ok: true, kit, pipeline });
  } catch (error) {
    const isProviderFailure = /GEMINI_API_KEY|LLM request|LLM returned|LLM response|timed out|quota|rate limit|did not identify|missed must-have/i.test(error.message || '');
    return res.status(isProviderFailure ? 503 : 500).json({
      message: isProviderFailure ? 'The AI generation service is temporarily unavailable.' : 'Failed to generate kit.',
      error: error.message,
    });
  }
});

module.exports = router;
