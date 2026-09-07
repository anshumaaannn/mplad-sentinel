import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { ProjectController } from './controllers/project.controller.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { AgencyController } from './controllers/agency.controller.js';
import { ConfigController } from './controllers/config.controller.js';
import { AssistantController } from './controllers/assistant.controller.js';
import { StorageService } from './services/storage.service.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Setup upload parser in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize Storage & Intelligence Engine
StorageService.initialize();

// ==========================================
// API ROUTES
// ==========================================

// Health & System
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MPLAD Sentinel AI Risk Intelligence Engine',
    version: '1.0.0-PROTOTYPE',
    timestamp: new Date().toISOString()
  });
});

// Dashboard Analytics
app.get('/api/dashboard/summary', DashboardController.getSummary);
app.get('/api/dashboard/trends', DashboardController.getTrends);
app.get('/api/dashboard/geography', DashboardController.getGeography);

// Projects Catalog & Detail
app.get('/api/projects', ProjectController.getProjects);
app.get('/api/projects/:id', ProjectController.getProjectById);
app.get('/api/projects/:id/risk', ProjectController.getProjectRisk);
app.get('/api/projects/:id/explanation', ProjectController.getProjectExplanation);
app.get('/api/projects/:id/similar', ProjectController.getProjectSimilar);

// Duplicate Hub
app.get('/api/duplicates', ProjectController.getAllDuplicates);

// Agency Analytics
app.get('/api/agencies', AgencyController.getAgencies);
app.get('/api/agencies/:name', AgencyController.getAgencyByName);

// Ingestion & Operations
app.post('/api/projects/upload', upload.single('file'), ProjectController.uploadCSV);
app.post('/api/analyze', ProjectController.reAnalyze);
app.post('/api/reset-demo', ProjectController.resetDemo);

// Config Studio
app.get('/api/config', ConfigController.getConfig);
app.post('/api/config', ConfigController.updateConfig);
app.post('/api/config/reset', ConfigController.resetConfig);

// Natural Language AI Assistant
app.post('/api/assistant/query', AssistantController.query);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MPLAD SENTINEL Backend Server running on port ${PORT}`);
  console.log(`📊 AI Risk Intelligence Engine Active`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});

export default app;
