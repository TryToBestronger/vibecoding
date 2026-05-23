const API_BASE = '/api';

let keywords = [];
let hotspots = [];
let notifications = [];
let whitelist = [];
let currentSourceFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  setupCardSpotlight();
  setupSourceFilter();
  startAutoRefresh();
});

function initApp() {
  loadKeywords();
  loadHotspots();
  loadNotifications();
  loadWhitelist();
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
  
  // 白名单
  document.getElementById('whitelistBtn').addEventListener('click', openWhitelistModal);
  document.getElementById('closeWhitelistBtn').addEventListener('click', closeWhitelistModal);
  document.getElementById('addWhitelistBtn').addEventListener('click', addWhitelistAccount);

  document.getElementById('addKeywordModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddKeywordModal();
  });
  
  document.getElementById('whitelistModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWhitelistModal();
  });

  document.getElementById('keywordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addKeyword();
  });
  
  document.getElementById('whitelistInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addWhitelistAccount();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddKeywordModal();
      closeWhitelistModal();
      closeNotificationPanel();
    }
  });
}

function setupCardSpotlight() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.keyword-card, .hotspot-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

function setupSourceFilter() {
  const filterContainer = document.getElementById('sourceFilter');
  if (!filterContainer) return;
  
  filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-chip')) {
      filterContainer.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
      e.target.classList.add('active');
      currentSourceFilter = e.target.dataset.source;
      renderHotspots();
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

  if (!keywords || keywords.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <p class="empty-title">暂无监控关键词</p>
        <p>点击「添加关键词」开始追踪 AI 领域最新动态</p>
      </div>`;
    return;
  }

  grid.innerHTML = keywords.map(keyword => `
    <div class="keyword-card">
      <div class="card-content">
        <div class="keyword-header">
          <div class="keyword-name">${escapeHtml(keyword.keyword)}</div>
          <div class="keyword-actions">
            <button class="btn-icon" onclick="checkKeyword('${keyword.id}')" title="立即检查">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="toggleKeyword('${keyword.id}')" title="${keyword.enabled ? '停用' : '启用'}">
              ${keyword.enabled
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'}
            </button>
            <button class="btn-icon danger" onclick="deleteKeyword('${keyword.id}')" title="删除">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="keyword-meta">
          <span class="keyword-category">${escapeHtml(keyword.category || 'AI编程')}</span>
          <span class="keyword-status ${keyword.enabled !== false ? 'active' : 'inactive'}"></span>
          <span>${keyword.lastChecked ? formatTime(keyword.lastChecked) : '待检查'}</span>
        </div>
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
  }
}

function renderHotspots() {
  const list = document.getElementById('hotspotsList');

  // 应用来源筛选
  let filteredHotspots = hotspots;
  if (currentSourceFilter !== 'all') {
    filteredHotspots = hotspots.filter(h => {
      // 匹配主来源或合并的来源列表
      if (h.source === currentSourceFilter) return true;
      if (h.sources && h.sources.includes(currentSourceFilter)) return true;
      return false;
    });
  }

  if (!filteredHotspots || filteredHotspots.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
        <p class="empty-title">等待发现热点</p>
        <p>点击「发现热点」开始全网扫描，第一时间获取 AI 领域最新动态</p>
      </div>`;
    return;
  }

  list.innerHTML = filteredHotspots.map((hotspot, index) => `
    <div class="hotspot-card" onclick="openHotspotLink('${escapeHtml(hotspot.url || '')}')" style="animation: cardFadeIn 0.3s ease ${index * 0.05}s both;">
      <div class="card-content">
        <div class="hotspot-header">
          <div class="hotspot-title">${escapeHtml(hotspot.title)}</div>
          <div class="hotspot-badges">
            ${renderSourceBadges(hotspot)}
            ${renderQualityBadge(hotspot)}
          </div>
        </div>
        ${hotspot.content ? `<div class="hotspot-content">${escapeHtml(truncateText(hotspot.content, 150))}</div>` : ''}
        <div class="hotspot-footer">
          <div class="hotspot-metrics">
            ${renderMetrics(hotspot.metrics)}
            <span style="display:inline-flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:var(--text-tertiary);">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              ${escapeHtml(hotspot.keyword || '')}
            </span>
          </div>
          <span>${formatTime(hotspot.timestamp || hotspot.createdAt)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderSourceBadges(hotspot) {
  const sources = hotspot.sources || [hotspot.source].filter(Boolean);
  if (!sources.length) return '';
  
  return sources.map(source => {
    const colorClass = getSourceColorClass(source);
    return `<span class="source-badge ${colorClass}">${escapeHtml(source)}</span>`;
  }).join('');
}

function getSourceColorClass(source) {
  const map = {
    '微博': 'source-weibo',
    '微博热搜': 'source-weibo',
    '知乎': 'source-zhihu',
    '知乎热榜': 'source-zhihu',
    'B站': 'source-bilibili',
    'B站热门': 'source-bilibili',
    'Twitter/X': 'source-twitter',
    'Twitter热门': 'source-twitter'
  };
  return map[source] || 'source-default';
}

function renderQualityBadge(hotspot) {
  const score = hotspot.reliabilityScore || hotspot.aiAnalysis?.sourceReliability || hotspot.aiAnalysis?.qualityScore;
  if (!score) return '';
  
  let level = 'low';
  if (score >= 80) level = 'high';
  else if (score >= 60) level = 'medium';
  
  return `<span class="quality-badge quality-${level}">Q:${Math.round(score)}</span>`;
}

function renderMetrics(metrics) {
  if (!metrics) return '';
  const parts = [];
  if (metrics.likes) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${formatNumber(metrics.likes)}</span>`);
  if (metrics.retweets) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>${formatNumber(metrics.retweets)}</span>`);
  if (metrics.replies) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${formatNumber(metrics.replies)}</span>`);
  if (metrics.comments) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${formatNumber(metrics.comments)}</span>`);
  if (metrics.tweetVolume) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>${formatNumber(metrics.tweetVolume)}</span>`);
  if (metrics.forks) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>${formatNumber(metrics.forks)}</span>`);
  if (metrics.plays) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>${formatNumber(metrics.plays)}</span>`);
  if (metrics.danmakus) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${formatNumber(metrics.danmakus)}</span>`);
  if (metrics.favorites) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${formatNumber(metrics.favorites)}</span>`);
  if (metrics.coins) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>${formatNumber(metrics.coins)}</span>`);
  if (metrics.shares) parts.push(`<span class="metric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>${formatNumber(metrics.shares)}</span>`);
  return parts.join('');
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

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p class="empty-title">暂无通知</p>
        <p>新热点发现后将在此显示</p>
      </div>`;
    return;
  }

  list.innerHTML = notifications.map(notif => `
    <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead('${notif.id}')">
      <div class="notif-message">${escapeHtml(notif.message)}</div>
      <div class="notif-time">${formatTime(notif.createdAt)}</div>
    </div>
  `).join('');
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

// 白名单管理
async function loadWhitelist() {
  try {
    const response = await fetch(`${API_BASE}/keywords/whitelist`);
    const result = await response.json();
    if (result.success) {
      whitelist = result.data;
    }
  } catch (error) {
    console.error('加载白名单失败:', error);
  }
}

function renderWhitelist() {
  const list = document.getElementById('whitelistList');
  if (!whitelist || whitelist.length === 0) {
    list.innerHTML = `<p class="whitelist-empty">暂无白名单账号</p>`;
    return;
  }
  
  list.innerHTML = whitelist.map(account => `
    <div class="whitelist-item">
      <span class="whitelist-account">@${escapeHtml(account)}</span>
      <button class="btn-icon danger" onclick="removeWhitelistAccount('${escapeHtml(account)}')" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

async function addWhitelistAccount() {
  const input = document.getElementById('whitelistInput');
  const account = input.value.trim();
  
  if (!account) {
    showToast('请输入账号');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/keywords/whitelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account })
    });
    
    const result = await response.json();
    if (result.success) {
      whitelist = result.data;
      renderWhitelist();
      input.value = '';
      showToast('已添加白名单');
    }
  } catch (error) {
    console.error('添加白名单失败:', error);
    showToast('添加失败');
  }
}

async function removeWhitelistAccount(account) {
  try {
    const response = await fetch(`${API_BASE}/keywords/whitelist/${encodeURIComponent(account)}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      whitelist = result.data;
      renderWhitelist();
      showToast('已移除');
    }
  } catch (error) {
    console.error('移除白名单失败:', error);
    showToast('移除失败');
  }
}

function openWhitelistModal() {
  document.getElementById('whitelistModal').classList.add('active');
  renderWhitelist();
  document.getElementById('whitelistInput').focus();
}

function closeWhitelistModal() {
  document.getElementById('whitelistModal').classList.remove('active');
  document.getElementById('whitelistInput').value = '';
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
      showToast('关键词已添加，开始监控');
      closeAddKeywordModal();
      loadKeywords();
    } else {
      showToast(result.error || '添加失败');
    }
  } catch (error) {
    console.error('添加关键词失败:', error);
    showToast('网络异常，请重试');
  }
}

async function deleteKeyword(id) {
  if (!confirm('确定要删除这个关键词吗？')) return;

  try {
    const response = await fetch(`${API_BASE}/keywords/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showToast('已删除');
      loadKeywords();
    } else {
      showToast(result.error || '删除失败');
    }
  } catch (error) {
    console.error('删除关键词失败:', error);
    showToast('操作失败');
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
      showToast(keyword.enabled ? '已停用' : '已启用');
      loadKeywords();
    }
  } catch (error) {
    console.error('切换状态失败:', error);
    showToast('操作失败');
  }
}

async function checkKeyword(id) {
  showToast('正在检查...');

  try {
    const response = await fetch(`${API_BASE}/keywords/${id}/check`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      showToast('检查已启动，热点将逐渐出现');
      
      let pollCount = 0;
      const maxPolls = 20;
      const pollInterval = 3000;
      
      const pollTimer = setInterval(async () => {
        pollCount++;
        
        await loadHotspots();
        await loadNotifications();
        
        if (pollCount >= maxPolls) {
          clearInterval(pollTimer);
          showToast('检查完成');
        }
      }, pollInterval);
      
      setTimeout(() => {
        clearInterval(pollTimer);
      }, pollInterval * maxPolls);
    }
  } catch (error) {
    console.error('检查关键词失败:', error);
    showToast('检查失败');
  }
}

async function discoverHotspots() {
  const btn = document.getElementById('discoverBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    搜索中...
  `;

  try {
    const response = await fetch(`${API_BASE}/hotspots/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'AI编程' })
    });

    const result = await response.json();
    if (result.success) {
      showToast('热点发现已启动，数据将逐渐出现');
      
      let pollCount = 0;
      const maxPolls = 20;
      const pollInterval = 3000;
      
      const pollTimer = setInterval(async () => {
        pollCount++;
        await loadHotspots();
        
        if (pollCount >= maxPolls) {
          clearInterval(pollTimer);
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          showToast('热点发现完成');
        }
      }, pollInterval);
      
      setTimeout(() => {
        clearInterval(pollTimer);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }, pollInterval * maxPolls);
    } else {
      showToast(result.error || '发现失败');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  } catch (error) {
    console.error('发现热点失败:', error);
    showToast('网络异常，请重试');
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function clearAllHotspots() {
  if (!confirm('确定要清空所有热点吗？')) return;

  try {
    const response = await fetch(`${API_BASE}/hotspots/clear`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showToast('热点已清空');
      loadHotspots();
    } else {
      showToast(result.error || '清空失败');
    }
  } catch (error) {
    console.error('清空热点失败:', error);
    showToast('操作失败');
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
    await fetch(`${API_BASE}/hotspots/notifications/${id}/read`, { method: 'PUT' });
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
  const msgEl = document.getElementById('toastMessage');
  msgEl.textContent = message;
  toast.classList.add('active');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
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
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function startAutoRefresh() {
  setInterval(() => {
    loadHotspots();
    loadNotifications();
  }, 60000);
}
