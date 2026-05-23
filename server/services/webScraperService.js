const axios = require('axios');

const lastRequestTime = {};
const MIN_REQUEST_INTERVAL = 5000;

function stripCDATA(str) {
  if (!str) return '';
  return str.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();
}

function stripTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function parseBingRSS(xml, keyword) {
  const results = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && results.length < 5) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/);
    const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/);

    const title = titleMatch ? stripTags(stripCDATA(titleMatch[1])) : '';
    if (!title || title.length < 5) continue;

    results.push({
      title,
      content: descMatch ? stripTags(stripCDATA(descMatch[1])).substring(0, 300) : title,
      source: 'Bing News',
      platform: 'bing',
      timestamp: pubDateMatch ? new Date(stripCDATA(pubDateMatch[1])).toISOString() : new Date().toISOString(),
      keyword,
      url: linkMatch ? stripTags(stripCDATA(linkMatch[1])) : '',
      metrics: {},
      reliabilityScore: 65
    });
  }

  return results;
}

// Google News RSS 免费、稳定、无需 Key，替代 Bing HTML 抓取
async function searchWeb(keyword, maxResults = 5) {
  const engineKey = 'GoogleNews';
  const now = Date.now();

  if (lastRequestTime[engineKey] && (now - lastRequestTime[engineKey]) < MIN_REQUEST_INTERVAL) {
    console.log('跳过 Google新闻，请求过于频繁');
    return [];
  }

  lastRequestTime[engineKey] = now;

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'AI-Hotspot-Monitor/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 10000
    });

    const results = parseBingRSS(response.data, keyword);
    // 将 source 统一标记为 Google新闻
    results.forEach(r => { r.source = 'Google新闻'; r.platform = 'google_news'; });
    console.log(`Google新闻搜索"${keyword}"：${results.length} 条`);
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Google新闻搜索失败:', error.message);
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  searchWeb
};
