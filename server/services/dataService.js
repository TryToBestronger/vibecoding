const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');
const HOTSPOTS_FILE = path.join(DATA_DIR, 'hotspots.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error.message);
  }
  return defaultValue;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`写入文件失败 ${filePath}:`, error.message);
    return false;
  }
}

function getAllKeywords() {
  return readJSON(KEYWORDS_FILE, []);
}

function addKeyword(keyword, category = 'AI编程') {
  const keywords = getAllKeywords();
  const newKeyword = {
    id: Date.now().toString(),
    keyword: keyword,
    category: category,
    enabled: true,
    createdAt: new Date().toISOString(),
    lastChecked: null
  };
  keywords.push(newKeyword);
  writeJSON(KEYWORDS_FILE, keywords);
  return newKeyword;
}

function updateKeyword(id, updates) {
  const keywords = getAllKeywords();
  const index = keywords.findIndex(k => k.id === id);
  if (index !== -1) {
    keywords[index] = { ...keywords[index], ...updates };
    writeJSON(KEYWORDS_FILE, keywords);
    return keywords[index];
  }
  return null;
}

function deleteKeyword(id) {
  const keywords = getAllKeywords();
  const filtered = keywords.filter(k => k.id !== id);
  writeJSON(KEYWORDS_FILE, filtered);
  return filtered.length < keywords.length;
}

function getAllHotspots(limit = 50) {
  const hotspots = readJSON(HOTSPOTS_FILE, []);
  return hotspots.slice(0, limit);
}

function addHotspot(hotspot) {
  const hotspots = readJSON(HOTSPOTS_FILE, []);
  const newHotspot = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    ...hotspot,
    createdAt: new Date().toISOString()
  };
  hotspots.unshift(newHotspot);
  
  if (hotspots.length > 200) {
    hotspots.splice(200);
  }
  
  writeJSON(HOTSPOTS_FILE, hotspots);
  return newHotspot;
}

function getHotspotsByKeyword(keyword) {
  const hotspots = readJSON(HOTSPOTS_FILE, []);
  return hotspots.filter(h => h.keyword === keyword);
}

function deleteHotspot(id) {
  const hotspots = readJSON(HOTSPOTS_FILE, []);
  const filtered = hotspots.filter(h => h.id !== id);
  writeJSON(HOTSPOTS_FILE, filtered);
  return filtered.length < hotspots.length;
}

function clearAllHotspots() {
  writeJSON(HOTSPOTS_FILE, []);
  return true;
}

function addNotification(notification) {
  const notifications = readJSON(NOTIFICATIONS_FILE, []);
  const newNotification = {
    id: Date.now().toString(),
    ...notification,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(newNotification);
  
  if (notifications.length > 100) {
    notifications.splice(100);
  }
  
  writeJSON(NOTIFICATIONS_FILE, notifications);
  return newNotification;
}

function getAllNotifications() {
  return readJSON(NOTIFICATIONS_FILE, []);
}

function markNotificationAsRead(id) {
  const notifications = readJSON(NOTIFICATIONS_FILE, []);
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    writeJSON(NOTIFICATIONS_FILE, notifications);
    return notification;
  }
  return null;
}

module.exports = {
  getAllKeywords,
  addKeyword,
  updateKeyword,
  deleteKeyword,
  getAllHotspots,
  addHotspot,
  getHotspotsByKeyword,
  deleteHotspot,
  clearAllHotspots,
  addNotification,
  getAllNotifications,
  markNotificationAsRead
};
