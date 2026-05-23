const twitterService = require('./twitterService');
const webScraperService = require('./webScraperService');
const aiService = require('./aiService');
const dataService = require('./dataService');
const converterService = require('./converterService');

async function checkAllKeywords() {
  const keywords = dataService.getAllKeywords();
  const enabledKeywords = keywords.filter(k => k.enabled);
  
  console.log(`开始检查 ${enabledKeywords.length} 个关键词...`);
  
  for (const keywordObj of enabledKeywords) {
    await checkKeyword(keywordObj);
    await sleep(3000);
  }
}

async function checkKeyword(keywordObj) {
  const { keyword, id } = keywordObj;
  console.log(`检查关键词: ${keyword}`);
  
  try {
    const existingHotspots = dataService.getHotspotsByKeyword(keyword);
    existingHotspots.forEach(hotspot => {
      dataService.deleteHotspot(hotspot.id);
    });
    
    const results = await collectHotspots(keyword);
    
    for (const result of results) {
      const convertedResult = converterService.convertHotspotToSimplified(result);
      
      await sleep(2000);
      
      const analysis = await aiService.analyzeContent(convertedResult.content || convertedResult.title, keyword);
      
      if (analysis.isRelevant && analysis.confidence > 60) {
        const hotspot = dataService.addHotspot({
          ...convertedResult,
          aiAnalysis: analysis
        });
        
        dataService.addNotification({
          type: 'keyword_match',
          keyword: keyword,
          hotspot: hotspot,
          message: `发现关键词"${keyword}"相关热点: ${convertedResult.title}`
        });
      } else if (analysis.confidence === 70 && analysis.reason.includes('AI未配置')) {
        const hotspot = dataService.addHotspot({
          ...convertedResult,
          aiAnalysis: analysis
        });
        
        dataService.addNotification({
          type: 'keyword_match',
          keyword: keyword,
          hotspot: hotspot,
          message: `发现关键词"${keyword}"相关热点: ${convertedResult.title}`
        });
      }
    }
    
    dataService.updateKeyword(id, { lastChecked: new Date().toISOString() });
  } catch (error) {
    console.error(`检查关键词 ${keyword} 失败:`, error.message);
  }
}

async function collectHotspots(keyword) {
  const allResults = [];
  
  try {
    const twitterResults = await twitterService.searchTweets(keyword, 5);
    allResults.push(...twitterResults);
  } catch (error) {
    console.error('Twitter搜索失败:', error.message);
  }
  
  try {
    const webResults = await webScraperService.searchWeb(keyword);
    allResults.push(...webResults);
  } catch (error) {
    console.error('网页搜索失败:', error.message);
  }
  
  return allResults;
}

async function discoverTrendingHotspots(category = 'AI编程') {
  console.log(`发现 ${category} 领域的热点...`);
  
  const allHotspots = dataService.getAllHotspots(200);
  allHotspots.forEach(hotspot => {
    dataService.deleteHotspot(hotspot.id);
  });
  
  const results = [];
  
  try {
    const twitterTrends = await twitterService.getTrendingTopics();
    const aiRelatedTrends = twitterTrends.filter(trend => 
      trend.name.toLowerCase().includes('ai') || 
      trend.name.toLowerCase().includes('gpt') ||
      trend.name.toLowerCase().includes('llm')
    );
    
    for (const trend of aiRelatedTrends.slice(0, 5)) {
      results.push({
        title: trend.name,
        source: 'Twitter Trending',
        timestamp: new Date().toISOString(),
        keyword: category,
        metrics: {
          tweetVolume: trend.tweet_volume || 0
        }
      });
    }
  } catch (error) {
    console.error('获取Twitter趋势失败:', error.message);
  }
  
  const searchKeywords = ['AI编程', 'GPT-4', 'Claude', 'LLM', '大模型'];
  for (const keyword of searchKeywords) {
    try {
      const webResults = await webScraperService.searchWeb(keyword);
      results.push(...webResults.slice(0, 2));
      await sleep(5000);
    } catch (error) {
      console.error(`搜索 ${keyword} 失败:`, error.message);
    }
  }
  
  for (const result of results) {
    const convertedResult = converterService.convertHotspotToSimplified(result);
    dataService.addHotspot(convertedResult);
  }
  
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  checkAllKeywords,
  checkKeyword,
  collectHotspots,
  discoverTrendingHotspots
};
