const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const monitorService = require('../services/monitorService');

router.get('/', (req, res) => {
  try {
    const { keyword, limit } = req.query;
    let hotspots;
    
    if (keyword) {
      hotspots = dataService.getHotspotsByKeyword(keyword);
    } else {
      hotspots = dataService.getAllHotspots(limit ? parseInt(limit) : 50);
    }
    
    res.json({ success: true, data: hotspots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/discover', async (req, res) => {
  try {
    const { category } = req.body;
    const hotspots = await monitorService.discoverTrendingHotspots(category);
    res.json({ success: true, data: hotspots, message: `发现 ${hotspots.length} 个热点` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/notifications', (req, res) => {
  try {
    const notifications = dataService.getAllNotifications();
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const notification = dataService.markNotificationAsRead(id);
    if (notification) {
      res.json({ success: true, data: notification });
    } else {
      res.status(404).json({ success: false, error: '通知不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/clear', (req, res) => {
  try {
    dataService.clearAllHotspots();
    res.json({ success: true, message: '所有热点已清空' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
