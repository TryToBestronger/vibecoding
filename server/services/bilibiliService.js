const axios = require('axios');
const bilibiliWbiService = require('./bilibiliWbiService');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// B站搜索质量阈值
const BILIBILI_MIN_VIEWS = parseInt(process.env.BILIBILI_MIN_VIEWS) || 10000;
const BILIBILI_MIN_FAVORITES = parseInt(process.env.BILIBILI_MIN_FAVORITES) || 200;

async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      console.log(`请求失败，正在重试 (${i + 1}/${retries}): ${url}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getBilibiliHeaders(referer = 'https://www.bilibili.com') {
  const headers = {
    'User-Agent': getRandomUA(),
    'Referer': referer,
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.bilibili.com'
  };
  const cookie = process.env.BILIBILI_COOKIE;
  if (cookie) {
    headers.Cookie = cookie;
  }
  return headers;
}

async function searchBilibili(keyword, maxResults = 5) {
  const searchUrl = 'https://api.bilibili.com/x/web-interface/search/type';
  const referer = 'https://www.bilibili.com/search?keyword=' + encodeURIComponent(keyword);

  try {
    console.log(`B站搜索关键词: ${keyword}`);
    let response;

    for (let attempt = 0; attempt <= 2; attempt++) {
      const { imgKey, subKey } = await bilibiliWbiService.getWbiKeys(attempt > 0);
      const signedParams = bilibiliWbiService.signParams({
        search_type: 'video',
        keyword,
        page: 1,
        page_size: Math.max(maxResults * 4, 12),
        order: 'pubdate'
      }, imgKey, subKey);

      response = await axios.get(searchUrl, {
        params: signedParams,
        headers: getBilibiliHeaders(referer),
        timeout: 30000,
        validateStatus: () => true
      });

      const isBanned = response.status === 412 || response.data?.code === -412;
      if (isBanned) {
        if (attempt === 2) {
          console.error('B站搜索失败: 触发风控 (412)，可配置 BILIBILI_COOKIE 后重试');
          return [];
        }
        bilibiliWbiService.clearCache();
        console.log(`B站搜索触发风控，正在重试 (${attempt + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
        continue;
      }

      break;
    }

    if (!response.data || response.data.code !== 0) {
      console.log('B站搜索返回数据异常:', response.data?.message || response.data?.code);
      return [];
    }

    const results = response.data.data?.result || [];
    if (!Array.isArray(results)) return [];

    return results
      .filter(video => video.play >= BILIBILI_MIN_VIEWS || video.favorites >= BILIBILI_MIN_FAVORITES)
      .slice(0, maxResults)
      .map(video => ({
        title: stripHtml(video.title),
        content: stripHtml(video.description || video.title).substring(0, 500),
        source: 'B站',
        platform: 'bilibili',
        timestamp: new Date((video.pubdate || Date.now() / 1000) * 1000).toISOString(),
        keyword: keyword,
        url: `https://www.bilibili.com/video/${video.bvid || 'av' + video.aid}`,
        metrics: {
          views: video.play || 0,
          favorites: video.favorites || 0,
          danmaku: video.video_review || 0
        },
        reliabilityScore: 75,
        author: video.author || ''
      }));
  } catch (error) {
    console.error('B站搜索失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getBilibiliHot(maxResults = 10) {
  try {
    const hotUrl = 'https://api.bilibili.com/x/web-interface/popular';
    const response = await fetchWithRetry(hotUrl, {
      params: {
        ps: maxResults,
        pn: 1
      },
      headers: getBilibiliHeaders('https://www.bilibili.com'),
      timeout: 30000
    });

    if (!response.data || response.data.code !== 0) {
      console.log('B站热门返回数据异常:', response.data?.message);
      return [];
    }

    const list = response.data.data?.list || [];
    if (!Array.isArray(list)) return [];

    return list.slice(0, maxResults).map(video => ({
      title: stripHtml(video.title),
      content: stripHtml(video.desc || video.title).substring(0, 500),
      source: 'B站热门',
      platform: 'bilibili',
      timestamp: new Date((video.pubdate || Date.now() / 1000) * 1000).toISOString(),
      keyword: 'B站热门',
      url: `https://www.bilibili.com/video/${video.bvid}`,
      metrics: {
        views: video.stat?.view || 0,
        favorites: video.stat?.favorite || 0,
        danmaku: video.stat?.danmaku || 0,
        likes: video.stat?.like || 0
      },
      reliabilityScore: 80,
      author: video.owner?.name || ''
    }));
  } catch (error) {
    console.error('B站热门获取失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getUserVideos(uid, maxResults = 5) {
  try {
    const userUrl = 'https://api.bilibili.com/x/space/arc/search';
    const response = await fetchWithRetry(userUrl, {
      params: {
        mid: uid,
        ps: maxResults,
        pn: 1,
        order: 'pubdate'
      },
      headers: getBilibiliHeaders('https://www.bilibili.com'),
      timeout: 30000
    });

    if (!response.data || response.data.code !== 0) {
      console.log('B站用户视频返回数据异常:', response.data?.message);
      return [];
    }

    const vlist = response.data.data?.list?.vlist || [];
    if (!Array.isArray(vlist)) return [];

    return vlist.slice(0, maxResults).map(video => ({
      title: stripHtml(video.title),
      content: stripHtml(video.description || video.title).substring(0, 500),
      source: 'B站',
      platform: 'bilibili',
      timestamp: new Date((video.created || Date.now() / 1000) * 1000).toISOString(),
      keyword: uid,
      url: `https://www.bilibili.com/video/${video.bvid}`,
      metrics: {
        views: video.play || 0,
        favorites: video.favorites || 0,
        danmaku: video.video_review || 0
      },
      reliabilityScore: 80,
      author: video.author || '',
      isAccountPost: true
    }));
  } catch (error) {
    console.error(`B站用户 ${uid} 视频获取失败:`, error.message);
    return [];
  }
}

module.exports = {
  searchBilibili,
  getBilibiliHot,
  getUserVideos
};
