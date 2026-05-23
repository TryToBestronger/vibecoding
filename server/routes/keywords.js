const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const monitorService = require('../services/monitorService');

router.get('/', (req, res) => {
  try {
    const keywords = dataService.getAllKeywords();
    res.json({ success: true, data: keywords });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { keyword, category } = req.body;
    if (!keyword) {
      return res.status(400).json({ success: false, error: '关键词不能为空' });
    }
    const newKeyword = dataService.addKeyword(keyword, category);
    res.json({ success: true, data: newKeyword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = dataService.updateKeyword(id, updates);
    if (updated) {
      res.json({ success: true, data: updated });
    } else {
      res.status(404).json({ success: false, error: '关键词不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = dataService.deleteKeyword(id);
    if (deleted) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, error: '关键词不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const keywords = dataService.getAllKeywords();
    const keyword = keywords.find(k => k.id === id);
    
    if (!keyword) {
      return res.status(404).json({ success: false, error: '关键词不存在' });
    }
    
    monitorService.checkKeyword(keyword);
    res.json({ success: true, message: '开始检查关键词' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
