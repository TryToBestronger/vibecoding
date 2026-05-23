const axios = require('axios');

const SEARCH_ENGINES = [
  {
    name: 'Bing',
    url: (keyword) => `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}`,
    parser: parseBingResults
  }
];

const lastRequestTime = {};
const MIN_REQUEST_INTERVAL = 5000;

async function searchWeb(keyword) {
  const results = [];
  
  for (const engine of SEARCH_ENGINES) {
    const engineKey = engine.name;
    const now = Date.now();
    
    if (lastRequestTime[engineKey] && (now - lastRequestTime[engineKey]) < MIN_REQUEST_INTERVAL) {
      console.log(`跳过 ${engineKey}，请求过于频繁`);
      continue;
    }
    
    try {
      lastRequestTime[engineKey] = now;
      
      const response = await axios.get(engine.url(keyword), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      const parsed = engine.parser(response.data, keyword);
      results.push(...parsed);
      
      await sleep(2000);
    } catch (error) {
      console.error(`${engineKey} 搜索失败:`, error.message);
    }
  }
  
  return results;
}

function parseGoogleResults(html, keyword) {
  const results = [];
  const titleRegex = /<h3[^>]*>(.*?)<\/h3>/g;
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>/g;
  
  let match;
  let count = 0;
  while ((match = titleRegex.exec(html)) !== null && count < 5) {
    const title = match[1].replace(/<[^>]*>/g, '');
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      results.push({
        title: title,
        source: 'Google News',
        timestamp: new Date().toISOString(),
        keyword: keyword
      });
      count++;
    }
  }
  
  return results;
}

function parseBingResults(html, keyword) {
  const results = [];
  const titleRegex = /<a[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/a>/g;
  
  let match;
  let count = 0;
  while ((match = titleRegex.exec(html)) !== null && count < 5) {
    const title = match[1].replace(/<[^>]*>/g, '');
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      results.push({
        title: title,
        source: 'Bing News',
        timestamp: new Date().toISOString(),
        keyword: keyword
      });
      count++;
    }
  }
  
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  searchWeb
};
