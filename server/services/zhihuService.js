const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 知乎搜索质量阈值（仅对关键词搜索生效，热榜不过滤）
const ZHIHU_MIN_VOTEUP = parseInt(process.env.ZHIHU_MIN_VOTEUP) || 200;
const ZHIHU_MIN_COMMENT = parseInt(process.env.ZHIHU_MIN_COMMENT) || 20;

function getZhihuHeaders() {
  const headers = {
    'User-Agent': getRandomUA(),
    'Referer': 'https://www.zhihu.com/',
    'x-api-version': '3.0.91',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.zhihu.com'
  };
  const cookie = process.env.ZHIHU_COOKIE;
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
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

async function searchZhihu(keyword, maxResults = 5) {
  console.log(`知乎搜索关键词: ${keyword}`);

  try {
    const searchUrl = 'https://www.zhihu.com/api/v4/search_v3';
    const response = await fetchWithRetry(searchUrl, {
      params: {
        t: 'general',
        q: keyword,
        correction: '1',
        offset: '0',
        limit: String(maxResults * 2),
        lc_idx: '0',
        show_all_topics: '0',
        search_source: 'Normal'
      },
      headers: getZhihuHeaders(),
      timeout: 30000
    });

    if (!response.data || !response.data.data) {
      console.log('知乎搜索返回数据异常');
      return [];
    }

    const results = [];
    for (const item of response.data.data) {
      if (item.type === 'search_result' && item.object) {
        const obj = item.object;
        let title = '';
        let content = '';
        let url = '';
        
        if (obj.question) {
          title = obj.question.title || '';
          content = stripHtml(obj.excerpt || obj.content || '').substring(0, 500);
          url = `https://www.zhihu.com/question/${obj.question.id}/answer/${obj.id}`;
        } else if (obj.title) {
          title = obj.title;
          content = stripHtml(obj.excerpt || obj.content || '').substring(0, 500);
          url = obj.url || `https://www.zhihu.com/question/${obj.id}`;
        }

        const voteup = obj.voteup_count || 0;
        const comment = obj.comment_count || 0;
        if (title && (voteup >= ZHIHU_MIN_VOTEUP || comment >= ZHIHU_MIN_COMMENT)) {
          results.push({
            title: stripHtml(title),
            content: content,
            source: '知乎',
            platform: 'zhihu',
            timestamp: new Date((obj.created_time || obj.updated_time || Date.now() / 1000) * 1000).toISOString(),
            keyword: keyword,
            url: url,
            metrics: {
              voteup,
              comment
            },
            reliabilityScore: 80,
            author: obj.author?.name || ''
          });
        }

        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch (error) {
    console.error('知乎搜索失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.status === 403 || error.response.status === 401) {
        console.error('知乎需要登录或 Cookie 已过期，请配置 ZHIHU_COOKIE 环境变量');
      }
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getZhihuHot(maxResults = 10) {
  try {
    const hotUrl = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total';
    const response = await fetchWithRetry(hotUrl, {
      params: {
        limit: maxResults,
        desktop: true
      },
      headers: getZhihuHeaders(),
      timeout: 30000
    });

    if (!response.data || !response.data.data) {
      console.log('知乎热榜返回数据异常');
      return [];
    }

    return response.data.data.slice(0, maxResults).map(item => {
      const target = item.target || {};
      const title = stripHtml(
        target.title ||
        target.title_area?.text ||
        item.title ||
        ''
      );
      const content = stripHtml(
        target.excerpt ||
        target.excerpt_area?.text ||
        target.content ||
        ''
      ).substring(0, 500);
      const questionId = target.id || item.card_id?.replace(/^Q_/, '') || '';
      return {
        title,
        content: content || title,
        source: '知乎热榜',
        platform: 'zhihu',
        timestamp: new Date((target.created || Date.now() / 1000) * 1000).toISOString(),
        keyword: '知乎热榜',
        url: target.url || (questionId ? `https://www.zhihu.com/question/${questionId}` : 'https://www.zhihu.com/hot'),
        metrics: {},
        reliabilityScore: 85
      };
    });
  } catch (error) {
    console.error('知乎热榜获取失败:', error.message);
    if (error.response) {
      console.error(`HTTP 错误: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.status === 403 || error.response.status === 401) {
        console.error('知乎需要登录或 Cookie 已过期，请配置 ZHIHU_COOKIE 环境变量');
      }
    } else if (error.request) {
      console.error('网络错误: 请求已发送但未收到响应');
    }
    return [];
  }
}

async function getUserActivities(userId, maxResults = 5) {
  try {
    const userUrl = `https://www.zhihu.com/api/v4/members/${userId}/activities`;
    const response = await fetchWithRetry(userUrl, {
      params: {
        limit: maxResults,
        after_id: 0,
        desktop: true
      },
      headers: getZhihuHeaders(),
      timeout: 30000
    });

    if (!response.data || !response.data.data) {
      console.log('知乎用户动态返回数据异常');
      return [];
    }

    const results = [];
    for (const activity of response.data.data) {
      const target = activity.target;
      if (target && target.title) {
        results.push({
          title: stripHtml(target.title),
          content: stripHtml(target.excerpt || target.content || '').substring(0, 500),
          source: '知乎',
          platform: 'zhihu',
          timestamp: new Date((target.created_time || activity.created_time || Date.now() / 1000) * 1000).toISOString(),
          keyword: userId,
          url: target.url || `https://www.zhihu.com/question/${target.id}`,
          metrics: {
            voteup: target.voteup_count || 0,
            comment: target.comment_count || 0
          },
          reliabilityScore: 80,
          author: target.author?.name || '',
          isAccountPost: true
        });

        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch (error) {
    console.error(`知乎用户 ${userId} 动态获取失败:`, error.message);
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      console.error('知乎需要登录或 Cookie 已过期，请配置 ZHIHU_COOKIE 环境变量');
    }
    return [];
  }
}

module.exports = {
  searchZhihu,
  getZhihuHot,
  getUserActivities
};
