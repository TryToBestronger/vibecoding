require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const keywordRoutes = require('./routes/keywords');
const hotspotRoutes = require('./routes/hotspots');
const monitorService = require('./services/monitorService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));
app.use(express.static(path.join(__dirname, '../public')));

// 仅为根路径和 HTML 文件设置 text/html 响应头
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  next();
});

app.use('/api/keywords', keywordRoutes);
app.use('/api/hotspots', hotspotRoutes);

cron.schedule('*/30 * * * *', () => {
  console.log('运行定时热点监控...');
  monitorService.checkAllKeywords();
});

app.listen(PORT, () => {
  console.log(`AI热点监控平台运行在 http://localhost:${PORT}`);
});
