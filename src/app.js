const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'SafeRideGo parent API' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/child', require('./routes/child'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/pickup-notes', require('./routes/pickupNotes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'That mobile number is already registered' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

module.exports = app;
