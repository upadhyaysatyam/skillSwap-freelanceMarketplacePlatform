const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  // origin: ['http://localhost:5174', 'http://localhost:3000'], 
  orgin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
});
app.set('io', io);

// ✅ MongoDB Connection (directly here instead of separate config)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Import Routes
const authRoutes = require('./services/auth/routes');
const projectRoutes = require('./services/projects/routes');
const biddingRoutes = require('./services/bidding/routes');
const messagingRoutes = require('./services/messaging/routes');
const reviewRoutes = require('./services/reviews/routes');
const adminRoutes = require('./services/admin/routes');
const notificationRoutes = require('./services/notifications/routes');
const dashboardRoutes = require('./services/dashboard/routes');
const analyticsRoutes = require('./services/analytics/routes');
const usersRoutes = require('./services/users/routes');
const freelancerRoutes = require('./services/freelancer/routes');
const testUploadRoutes = require('./test-upload-route');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', biddingRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notify', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/freelancer', freelancerRoutes);
app.use('/api', testUploadRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.io events
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project: ${projectId}`);
  });

  socket.on('new_bid', (data) => {
    io.to(data.projectId).emit('bid_update', data);
  });

  socket.on('work_submission', (data) => {
    io.to(data.projectId).emit('work_submission', data);
  });

  socket.on('project_update', (data) => {
    io.to(data.projectId).emit('project_update', data);
  });

  socket.on('join_dashboard', (userId) => {
    socket.join(`dashboard_${userId}`);
    console.log(`User ${socket.id} joined dashboard: dashboard_${userId}`);
  });

  socket.on('dashboard_update', (data) => {
    if (data.userId) {
      io.to(`dashboard_${data.userId}`).emit('dashboard_data_update', data);
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.chatId).emit('receive_message', data);
  });

  socket.on('mark_messages_read', (data) => {
    io.to(data.chatId).emit('messages_read', {
      chatId: data.chatId,
      userId: data.userId
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  // app.get('*', (req, res) => {
  //   res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  // })
   app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Notification service
const notificationService = require('./services/notifications/service');

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);

  notificationService.initNotificationService()
    .then(() => console.log('🔔 Notification service initialized'))
    .catch(error => console.error('Error initializing notification service:', error));
});
