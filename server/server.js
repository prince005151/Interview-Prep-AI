const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const app = express();
const { PORT, MONGO_URI, NODE_ENV, CLIENT_URL } = process.env;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const apiRoutes = require('./routes');

app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'AI Interview Prep API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Unexpected server error' });
});


const startServer = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing from server/.env');
    }

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    if (process.env.NODE_ENV === 'production') {
      const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

      app.use(express.static(clientDistPath));
      app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
    app.listen(PORT || 5000, () => {
      console.log(`Server running on port ${PORT || 5000}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
