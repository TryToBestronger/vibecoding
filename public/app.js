const API_BASE = '/api';

let keywords = [];
let hotspots = [];
let notifications = [];

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  startAutoRefresh();
});

function initApp() {
  loadKeywords();
  loadHotspots();
  loadNotifications();
}

function setupEventListeners() {
  document.getElementById('addKeywordBtn').addEventListener('click', openAddKeywordModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeAddKeywordModal);
  document.getElementById('cancelBtn').addEventListener('click', closeAddKeywordModal);
  document.getElementById('confirmAddBtn').addEventListener('click', addKeyword);
  document.getElementById('discoverBtn').addEventListener('click', discoverHotspots);
  document.getElementById('clearHotspotsBtn').addEventListener('click', clearAllHotspots);
  document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPanel);
  document.getElementById('closePanelBtn').addEventListener('click', closeNotificationPanel);
  
  document.getElementById('addKeywordModal').addEventListener('click', (e) => {
    if (e.target.id === 'addKeywordModal') {
      closeAddKeywordModal();
    }
  });
}

async function loadKeywords() {
  try {
    const response = await fetch(`${API_BASE}/keywords`);
    const result = await response.json();
    if (result.success) {
      keywords = result.data;
      renderKeywords();
    }
  } catch (error) {
    console.error('加载关键词失败:', error);
    showToast('加载关键词失败');
  }
}

function renderKeywords() {
  const grid = document.getElementById('keywordsGrid');
  
  if (keywords.length === 0) {
    grid.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无监控关键词，点击上方按钮添加</div>';
    return;
  }
  
  grid.innerHTML = keywords.map(keyword => `
    <div class="keyword-card">
      <div class="keyword-header">
        <div class="keyword-name">${keyword.keyword}</div>
        <div class="keyword-actions">
          <button class="btn-icon" onclick="checkKeyword('${keyword.id}')" title="立即检查">🔍</button>
          <button class="btn-icon" onclick="toggleKeyword('${keyword.id}')" title="${keyword.enabled ? '禁用' : '启用'}">
            ${keyword.enabled ? '✅' : '⏸️'}
          </button>
          <button class="btn-icon" onclick="deleteKeyword('${keyword.id}')" title="删除">🗑️</button>
        </div>
      </div>
      <div class="keyword-meta">
        <span class="keyword-category">${keyword.category}</span>
        <span>上次检查: ${keyword.lastChecked ? formatTime(keyword.lastChecked) : '未检查'}</span>
      </div>
    </div>
  `).join('');
}

async function loadHotspots() {
  try {
    const response = await fetch(`${API_BASE}/hotspots?limit=50`);
    const result = await response.json();
    if (result.success) {
      hotspots = result.data;
      renderHotspots();
    }
  } catch (error) {
    console.error('加载热点失败:', error);
    showToast('加载热点失败');
  }
}

function renderHotspots() {
  const list = document.getElementById('hotspotsList');
  
  if (hotspots.length === 0) {
    list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无热点数据，点击"发现热点"开始搜索</div>';
    return;
  }
  
  list.innerHTML = hotspots.map(hotspot => `
    <div class="hotspot-card" onclick="openHotspotLink('${hotspot.url || ''}')">
      <div class="hotspot-header">
        <div class="hotspot-title">${hotspot.title}</div>
        <span class="hotspot-source">${hotspot.source}</span>
      </div>
      ${hotspot.content ? `<div class="hotspot-content">${truncateText(hotspot.content, 150)}</div>` : ''}
      <div class="hotspot-footer">
        <div class="hotspot-metrics">
          ${hotspot.metrics ? renderMetrics(hotspot.metrics) : ''}
          <span>🏷️ ${hotspot.keyword}</span>
        </div>
        <span>${formatTime(hotspot.timestamp || hotspot.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function renderMetrics(metrics) {
  const parts = [];
  if (metrics.likes) parts.push(`❤️ ${formatNumber(metrics.likes)}`);
  if (metrics.retweets) parts.push(`🔄 ${formatNumber(metrics.retweets)}`);
  if (metrics.replies) parts.push(`💬 ${formatNumber(metrics.replies)}`);
  if (metrics.tweetVolume) parts.push(`📊 ${formatNumber(metrics.tweetVolume)}`);
  return parts.join(' ');
}

async function loadNotifications() {
  try {
    const response = await fetch(`${API_BASE}/hotspots/notifications`);
    const result = await response.json();
    if (result.success) {
      notifications = result.data;
      updateNotificationBadge();
      renderNotifications();
    }
  } catch (error) {
    console.error('加载通知失败:', error);
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationList');
  
  if (notifications.length === 0) {
    list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无通知</div>';
    return;
  }
  
  list.innerHTML = notifications.map(notif => `
    <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead('${notif.id}')">
      <div style="font-weight: 600; margin-bottom: 5px;">${notif.message}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">${formatTime(notif.createdAt)}</div>
    </div>
  `).join('');
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

function openAddKeywordModal() {
  document.getElementById('addKeywordModal').classList.add('active');
  document.getElementById('keywordInput').focus();
}

function closeAddKeywordModal() {
  document.getElementById('addKeywordModal').classList.remove('active');
  document.getElementById('keywordInput').value = '';
  document.getElementById('categoryInput').value = 'AI编程';
}

async function addKeyword() {
  const keyword = document.getElementById('keywordInput').value.trim();
  const category = document.getElementById('categoryInput').value.trim();
  
  if (!keyword) {
    showToast('请输入关键词');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, category })
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('关键词添加成功');
      closeAddKeywordModal();
      loadKeywords();
    } else {
      showToast('添加失败: ' + result.error);
    }
  } catch (error) {
    console.error('添加关键词失败:', error);
    showToast('添加关键词失败');
  }
}

async function deleteKeyword(id) {
  if (!confirm('确定要删除这个关键词吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/keywords/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('删除成功');
      loadKeywords();
    } else {
      showToast('删除失败: ' + result.error);
    }
  } catch (error) {
    console.error('删除关键词失败:', error);
    showToast('删除关键词失败');
  }
}

async function toggleKeyword(id) {
  const keyword = keywords.find(k => k.id === id);
  if (!keyword) return;
  
  try {
    const response = await fetch(`${API_BASE}/keywords/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !keyword.enabled })
    });
    
    const result = await response.json();
    if (result.success) {
      showToast(keyword.enabled ? '已禁用' : '已启用');
      loadKeywords();
    }
  } catch (error) {
    console.error('切换状态失败:', error);
    showToast('操作失败');
  }
}

async function checkKeyword(id) {
  showToast('开始检查关键词...');
  
  try {
    const response = await fetch(`${API_BASE}/keywords/${id}/check`, {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('检查已启动，请稍后查看结果');
      setTimeout(() => {
        loadHotspots();
        loadNotifications();
      }, 5000);
    }
  } catch (error) {
    console.error('检查关键词失败:', error);
    showToast('检查失败');
  }
}

async function discoverHotspots() {
  const btn = document.getElementById('discoverBtn');
  btn.disabled = true;
  btn.textContent = '🔍 搜索中...';
  
  try {
    const response = await fetch(`${API_BASE}/hotspots/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'AI编程' })
    });
    
    const result = await response.json();
    if (result.success) {
      showToast(result.message || '热点发现完成');
      loadHotspots();
    } else {
      showToast('发现失败: ' + result.error);
    }
  } catch (error) {
    console.error('发现热点失败:', error);
    showToast('发现热点失败');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 发现热点';
  }
}

async function clearAllHotspots() {
  if (!confirm('确定要清空所有热点吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/hotspots/clear`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('热点已清空');
      loadHotspots();
    } else {
      showToast('清空失败: ' + result.error);
    }
  } catch (error) {
    console.error('清空热点失败:', error);
    showToast('清空热点失败');
  }
}

function toggleNotificationPanel() {
  document.getElementById('notificationPanel').classList.toggle('active');
}

function closeNotificationPanel() {
  document.getElementById('notificationPanel').classList.remove('active');
}

async function markAsRead(id) {
  try {
    await fetch(`${API_BASE}/hotspots/notifications/${id}/read`, {
      method: 'PUT'
    });
    loadNotifications();
  } catch (error) {
    console.error('标记已读失败:', error);
  }
}

function openHotspotLink(url) {
  if (url && url !== 'undefined') {
    window.open(url, '_blank');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function startAutoRefresh() {
  setInterval(() => {
    loadHotspots();
    loadNotifications();
  }, 60000);
}
