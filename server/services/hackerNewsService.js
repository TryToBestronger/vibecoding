const axios = require('axios');

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const MIN_SCORE = parseInt(process.env.HN_MIN_SCORE) || 100;
const MIN_COMMENTS = parseInt(process.env.HN_MIN_COMMENTS) || 30;

async function fetchTopStories(limit = 10) {
  try {
    const response = await axios.get(`${HN_API_BASE}/topstories.json`, {
      timeout: 10000
    });
    return response.data.slice(0, limit * 2); // 多取一些用于过滤
  } catch (error) {
    console.error('获取 HN Top Stories 失败:', error.message);
    return [];
  }
}

async function fetchItem(id) {
  try {
    const response = await axios.get(`${HN_API_BASE}/item/${id}.json`, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error(`获取 HN Item ${id} 失败:`, error.message);
    return null;
  }
}

async function searchStories(keyword, maxResults = 5) {
  try {
    // HN 没有搜索 API，使用 Algolia 的 HN 搜索
    const response = await axios.get('https://hn.algolia.com/api/v1/search', {
      params: {
        query: keyword,
        tags: 'story',
        hitsPerPage: maxResults * 3
      },
      timeout: 10000
    });

    const hits = response.data.hits || [];
    
    // 过滤低质量内容
    const filtered = hits
      .filter(hit => hit.points >= MIN_SCORE || hit.num_comments >= MIN_COMMENTS)
      .slice(0, maxResults);

    return filtered.map(hit => ({
      title: hit.title,
      content: hit.story_text || hit.title,
      source: 'Hacker News',
      timestamp: new Date(hit.created_at).toISOString(),
      keyword: keyword,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      metrics: {
        likes: hit.points || 0,
        comments: hit.num_comments || 0
      },
      reliabilityScore: Math.min(50 + (hit.points || 0) / 10, 100),
      hnId: hit.objectID
    }));
  } catch (error) {
    console.error('HN 搜索失败:', error.message);
    return [];
  }
}

async function getTrendingStories(maxResults = 5) {
  try {
    const storyIds = await fetchTopStories(maxResults * 2);
    const stories = [];
    
    for (const id of storyIds.slice(0, maxResults * 2)) {
      const item = await fetchItem(id);
      if (item && item.type === 'story' && item.score >= MIN_SCORE) {
        stories.push({
          title: item.title,
          content: item.title,
          source: 'Hacker News',
          timestamp: new Date(item.time * 1000).toISOString(),
          keyword: 'AI编程',
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          metrics: {
            likes: item.score || 0,
            comments: item.descendants || 0
          },
          reliabilityScore: Math.min(50 + (item.score || 0) / 10, 100),
          hnId: item.id
        });
      }
      if (stories.length >= maxResults) break;
    }
    
    return stories;
  } catch (error) {
    console.error('获取 HN Trending 失败:', error.message);
    return [];
  }
}

module.exports = {
  searchStories,
  getTrendingStories
};
