const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/config');

const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'OK', message: 'Locket Gold API is running smoothly' });
});

// Fallback route cho Single Page Frontend
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Khởi chạy Server
app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`🚀 Locket Gold Server is running on port ${config.port}`);
  console.log(`🌐 Website: http://localhost:${config.port}`);
  console.log(`⚡ SePay Webhook Endpoint: http://localhost:${config.port}/api/webhooks/sepay`);
  console.log(`==================================================`);
});
