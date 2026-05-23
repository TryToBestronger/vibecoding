const axios = require('axios');

const RSSHUB_BASE_DEFAULT = 'http://localhost:1200';

const RSSHUB_FEEDS = [
  {
    name: 'B站热门',
    path: '/bilibili/hot',
    platform: 'bilibili',
    reliability: 80,
    keyword: 'B站热门'
  },
  {
    name: '微博热搜',
    path: '/weibo/search/hot',
    platform: 'weibo',
    reliability: 75,
    keyword: '微博热搜'
  },
  {
    name: '知乎热榜',
    path: '/zhihu/hotlist',
    platform: 'zhihu',
    reliability: 85,
    keyword: '知乎热榜'
  }
];

function getRSSHUBBaseUrl() {
  return (process.env.RSSHUB_BASE_URL || process.env.RSSHUB_BASE || RSSHUB_BASE_DEFAULT).replace(/\/$/, '');
}

// 专业 AI 媒体 RSS 源
const RSS_FEEDS = [
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    reliability: 85
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    reliability: 80
  },
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    reliability: 90
  }
];

function parseXMLItems(xml) {
  const items = [];
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const entryRegex = /<entry>(.*?)<\/entry>/gs;
  
  let matches = [...xml.matchAll(itemRegex)];
  if (matches.length === 0) {
    matches = [...xml.matchAll(entryRegex)];
  }
  
  for (const match of matches.slice(0, 5)) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/s);
    const descMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/s);
    const contentMatch = itemXml.match(/<content[^>]*>(.*?)<\/content>/s);
    const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/s);
    const linkHrefMatch = itemXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/s);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s);
    const publishedMatch = itemXml.match(/<published[^>]*>(.*?)<\/published>/s);
    const updatedMatch = itemXml.match(/<updated[^>]*>(.*?)<\/updated>/s);
    
    const title = titleMatch ? stripCDATA(titleMatch[1]) : '';
    const description = descMatch ? stripCDATA(descMatch[1]) : '';
    const content = contentMatch ? stripCDATA(contentMatch[1]) : '';
    const link = linkMatch ? stripCDATA(linkMatch[1]) : (linkHrefMatch ? linkHrefMatch[1] : '');
    const pubDate = pubDateMatch ? stripCDATA(pubDateMatch[1]) : 
                   (publishedMatch ? stripCDATA(publishedMatch[1]) : 
                   (updatedMatch ? stripCDATA(updatedMatch[1]) : new Date().toISOString()));
    
    if (title) {
      items.push({
        title: stripTags(title),
        content: stripTags(description || content || title).substring(0, 300),
        url: stripTags(link),
        timestamp: new Date(pubDate).toISOString()
      });
    }
  }
  
  return items;
}

function stripCDATA(str) {
  if (!str) return '';
  return str.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();
}

function stripTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

async function fetchRssUrl(feedUrl, feedInfo, keyword = 'AI编程') {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'AI-Hotspot-Monitor/1.0'
      }
    });

    const items = parseXMLItems(response.data);

    return items.map(item => ({
      title: item.title,
      content: item.content,
      source: feedInfo.name,
      platform: feedInfo.platform || undefined,
      timestamp: item.timestamp,
      keyword: feedInfo.keyword || keyword,
      url: item.url,
      metrics: {},
      reliabilityScore: feedInfo.reliability,
      feedUrl: feedUrl
    }));
  } catch (error) {
    console.error(`RSS 源 ${feedInfo.name} 获取失败:`, error.message);
    return [];
  }
}

async function fetchFeed(feedInfo) {
  return fetchRssUrl(feedInfo.url, feedInfo);
}

async function fetchRSSHUBFeed(feedInfo, maxResults = 5) {
  const feedUrl = `${getRSSHUBBaseUrl()}${feedInfo.path}`;
  const items = await fetchRssUrl(feedUrl, feedInfo, feedInfo.keyword);
  return items.slice(0, maxResults);
}

async function searchRSS(keyword, maxResults = 5) {
  const allResults = [];
  
  for (const feed of RSS_FEEDS) {
    try {
      const items = await fetchFeed(feed);
      const filtered = items.filter(item => 
        item.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(keyword.toLowerCase()))
      );
      allResults.push(...filtered);
    } catch (error) {
      console.error(`搜索 RSS ${feed.name} 失败:`, error.message);
    }
  }

  return allResults.slice(0, maxResults);
}

async function getTrendingFromRSS(maxResults = 5) {
  const allResults = [];
  
  for (const feed of RSS_FEEDS.slice(0, 3)) {
    try {
      const items = await fetchFeed(feed);
      allResults.push(...items.slice(0, 2));
    } catch (error) {
      console.error(`获取 RSS ${feed.name} 失败:`, error.message);
    }
  }

  return allResults
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, maxResults);
}

async function getTrendingFromRSSHUB(maxResults = 5) {
  const allResults = [];

  for (const feed of RSSHUB_FEEDS) {
    try {
      const items = await fetchRSSHUBFeed(feed, maxResults);
      allResults.push(...items);
    } catch (error) {
      console.error(`获取 RSSHub ${feed.name} 失败:`, error.message);
    }
  }

  return allResults
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, maxResults * RSSHUB_FEEDS.length);
}

module.exports = {
  searchRSS,
  getTrendingFromRSS,
  getTrendingFromRSSHUB,
  fetchRSSHUBFeed,
  getRSSHUBBaseUrl,
  RSS_FEEDS,
  RSSHUB_FEEDS
};
