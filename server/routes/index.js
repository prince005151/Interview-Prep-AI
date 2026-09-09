const express = require('express');
const authRoutes = require('./authRoutes');
const researchRoutes = require('./researchRoutes');
const generationRoutes = require('./generationRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/research', researchRoutes);
router.use('/generation', generationRoutes);

module.exports = router;
