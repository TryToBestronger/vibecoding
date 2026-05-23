const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 微博搜索质量阈值（仅对关键词搜索生效，热搜榜不过滤）
const WEIBO_MIN_LIKES = parseInt(process.env.WEIBO_MIN_LIKES) || 100;
const WEIBO_MIN_REPOSTS = parseInt(process.env.WEIBO_MIN_REPOSTS) || 30;
const WEIBO_MIN_COMMENTS = parseInt(process.env.WEIBO_MIN_COMMENTS) || 15;

function meetsWeiboThreshold(blog) {
  const likes = blog.attitudes_count || 0;
  const reposts = blog.reposts_count || 0;
  const comments = blog.comments_count || 0;
  return likes >= WEIBO_MIN_LIKES || reposts >= WEIBO_MIN_REPOSTS || comments >= WEIBO_MIN_COMMENTS;
}

function getWeiboHeaders(referer = 'https://m.weibo.cn/') {
  const headers = {
    'User-Agent': getRandomUA(),
    'Referer': referer,
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'MWeibo-Pwa': '1'
  };
  const cookie = process.env.WEIBO_COOKIE;
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
}

function getWeiboDesktopHeaders(referer = 'https://weibo.com/') {
  const headers = {
    'User-Agent': getRandomUA(),
    'Referer': referer,
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
  };
  const cookie = process.env.WEIBO_COOKIE;
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
}

function mapWeiboStatus(blog, keyword, options = {}) {
  const text = stripHtml(blog.text_raw || blog.text || '');
  return {
    title: text.substring(0, 100),
    content: text.substring(0, 500),
    source: '微博',
    platform: 'weibo',
    timestamp: new Date(blog.created_at).toISOString(),
    keyword,
    url: `https://weibo.com/${blog.user?.idstr || blog.user?.id}/${blog.mblogid || blog.idstr || blog.id}`,
    metrics: {
      reposts: blog.reposts_count || 0,
      comments: blog.comments_count || 0,
      likes: blog.attitudes_count || 0
    },
    reliabilityScore: options.reliabilityScore || 70,
    author: blog.user ? blog.user.screen_name : '',
    isAccountPost: options.isAccountPost || false
  };
}

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

async function searchWeiboDesktop(keyword, maxResults = 5) {
  const response = await fetchWithRetry('https://weibo.com/ajax/statuses/search', {
    params: {
      q: keyword,
      page: 1,
      containerid: `100103type=1&q=${encodeURIComponent(keyword)}`
    },
    headers: getWeiboDesktopHeaders(
      'https://s.weibo.com/weibo?q=' + encodeURIComponent(keyword)
    ),
    timeout: 30000
  });

  if (!response.data?.ok || !response.data.statuses) {
    return [];
  }

  return response.data.statuses
    .filter(blog => meetsWeiboThreshold(blog))
    .slice(0, maxResults)
    .map(blog => mapWeiboStatus(blog, keyword));
}

async function getWeiboTrendingDesktop(maxResults = 10) {
  const response = await fetchWithRetry('https://weibo.com/ajax/side/hotSearch', {
    headers: getWeiboDesktopHeaders('https://weibo.com/'),
    timeout: 30000
  });

  if (!response.data?.ok || !response.data.data?.realtime) {
    return [];
  }

  return response.data.data.realtime.slice(0, maxResults).map(item => ({
    title: item.word || item.note,
    content: item.note || item.word || '',
    source: '微博热搜',
    platform: 'weibo',
    timestamp: new Date().toISOString(),
    keyword: '微博热搜',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word_scheme || item.word || item.note)}`,
    metrics: {
      hot: item.num || 0
    },
    reliabilityScore: 75
  }));
}

async function searchWeibo(keyword, maxResults = 5) {
  console.log(`微博搜索关键词: ${keyword}`);

  if (process.env.WEIBO_COOKIE) {
    try {
      const desktopResults = await searchWeiboDesktop(keyword, maxResults);
      if (desktopResults.length > 0) {
        return desktopResults;
      }
    } catch (error) {
      console.error('微博 PC 端搜索失败:', error.message);
    }
  }

  try {
    const containerid = `100103type=1&q=${encodeURIComponent(keyword)}`;
    const apiUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${containerid}`;

    const response = await fetchWithRetry(apiUrl, {
      timeout: 30000,
      headers: getWeiboHeaders(
        'https://m.weibo.cn/search?containerid=100103type%3D1%26q%3D' + encodeURIComponent(keyword)
      )
    });

    if (!response.data || !response.data.data || !response.data.data.cards) {
      console.log('微博搜索返回数据格式异常');
      return [];
    }

    const results = [];
    for (const card of response.data.data.cards) {
      if (card.card_type === 9 && card.mblog && meetsWeiboThreshold(card.mblog)) {
        results.push(mapWeiboStatus(card.mblog, keyword));

        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch (error) {
    console.error('微博搜索失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.status === 403 || error.response.status === 401) {
        console.error('微博需要登录或 Cookie 已过期，请配置 WEIBO_COOKIE 环境变量');
      }
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getWeiboTrending(maxResults = 10) {
  if (process.env.WEIBO_COOKIE) {
    try {
      const desktopResults = await getWeiboTrendingDesktop(maxResults);
      if (desktopResults.length > 0) {
        return desktopResults;
      }
    } catch (error) {
      console.error('微博 PC 端热搜获取失败:', error.message);
    }
  }

  try {
    const apiUrl = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';
    
    const response = await fetchWithRetry(apiUrl, {
      timeout: 30000,
      headers: getWeiboHeaders()
    });

    if (!response.data || !response.data.data || !response.data.data.cards) {
      console.log('微博热搜返回数据格式异常');
      return [];
    }

    const results = [];
    for (const card of response.data.data.cards) {
      if (card.card_group) {
        for (const item of card.card_group) {
          if (item.desc) {
            results.push({
              title: item.desc,
              content: item.desc_extr || item.desc,
              source: '微博热搜',
              platform: 'weibo',
              timestamp: new Date().toISOString(),
              keyword: '微博热搜',
              url: item.scheme || `https://s.weibo.com/weibo?q=${encodeURIComponent(item.desc)}`,
              metrics: {},
              reliabilityScore: 75
            });
            
            if (results.length >= maxResults) break;
          }
        }
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (error) {
    console.error('微博热搜获取失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.status === 403 || error.response.status === 401) {
        console.error('微博需要登录或 Cookie 已过期，请配置 WEIBO_COOKIE 环境变量');
      }
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getUserPosts(uid, maxResults = 5) {
  try {
    const containerid = `107603${uid}`;
    const apiUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${containerid}`;
    
    const response = await fetchWithRetry(apiUrl, {
      timeout: 30000,
      headers: getWeiboHeaders()
    });

    if (!response.data || !response.data.data || !response.data.data.cards) {
      console.log('微博用户动态返回数据格式异常');
      return [];
    }

    const results = [];
    for (const card of response.data.data.cards) {
      if (card.card_type === 9 && card.mblog) {
        results.push(mapWeiboStatus(card.mblog, uid, {
          reliabilityScore: 80,
          isAccountPost: true
        }));
        
        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch (error) {
    console.error(`微博用户 ${uid} 动态获取失败:`, error.message);
    return [];
  }
}

module.exports = {
  searchWeibo,
  getWeiboTrending,
  getUserPosts
};
