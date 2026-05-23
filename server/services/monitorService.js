const weiboService = require('./weiboService');
const zhihuService = require('./zhihuService');
const bilibiliService = require('./bilibiliService');
const twitterService = require('./twitterService');
const accountDetectionService = require('./accountDetectionService');
const aiService = require('./aiService');
const dataService = require('./dataService');
const converterService = require('./converterService');
const deduplicationService = require('./deduplicationService');
const rssService = require('./rssService');

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
    const accountInfo = accountDetectionService.detectAccountType(keyword);
    let results;

    if (accountInfo.type === 'account') {
      results = await collectAccountHotspots(accountInfo);
    } else {
      results = await collectHotspots(keyword);
    }

    const existingHotspots = dataService.getAllHotspots(200);
    const deduplicated = deduplicationService.deduplicateAndMerge(results, existingHotspots);

    for (const result of deduplicated) {
      const convertedResult = converterService.convertHotspotToSimplified(result);

      await sleep(2000);

      const analysis = await aiService.analyzeContent(convertedResult.content || convertedResult.title, keyword);

      const threshold = aiService.getConfidenceThreshold();

      if (analysis.isRelevant && analysis.confidence >= threshold) {
        const hotspot = dataService.addHotspot({
          ...convertedResult,
          aiAnalysis: analysis
        });

        dataService.addNotification({
          type: accountInfo.type === 'account' ? 'account_update' : 'keyword_match',
          keyword: keyword,
          hotspot: hotspot,
          message: accountInfo.type === 'account'
            ? `${accountInfo.displayName} 发布新动态: ${convertedResult.title}`
            : `发现关键词"${keyword}"相关热点: ${convertedResult.title}`
        });
      } else if (!process.env.DEEPSEEK_API_KEY && analysis.confidence >= 75) {
        const hotspot = dataService.addHotspot({
          ...convertedResult,
          aiAnalysis: analysis
        });

        dataService.addNotification({
          type: accountInfo.type === 'account' ? 'account_update' : 'keyword_match',
          keyword: keyword,
          hotspot: hotspot,
          message: accountInfo.type === 'account'
            ? `${accountInfo.displayName} 发布新动态: ${convertedResult.title}`
            : `发现关键词"${keyword}"相关热点: ${convertedResult.title}`
        });
      }
    }

    dataService.updateKeyword(id, { lastChecked: new Date().toISOString() });
  } catch (error) {
    console.error(`检查关键词 ${keyword} 失败:`, error.message);
  }
}

async function collectAccountHotspots(accountInfo) {
  const allResults = [];

  switch (accountInfo.platform) {
    case 'weibo':
      try {
        const posts = await weiboService.getUserPosts(accountInfo.accountId, 5);
        allResults.push(...posts);
      } catch (error) {
        console.error(`微博账号 ${accountInfo.accountId} 获取失败:`, error.message);
      }
      break;

    case 'zhihu':
      try {
        const activities = await zhihuService.getUserActivities(accountInfo.accountId, 5);
        allResults.push(...activities);
      } catch (error) {
        console.error(`知乎用户 ${accountInfo.accountId} 获取失败:`, error.message);
      }
      break;

    case 'bilibili':
      try {
        const videos = await bilibiliService.getUserVideos(accountInfo.accountId, 5);
        allResults.push(...videos);
      } catch (error) {
        console.error(`B站UP主 ${accountInfo.accountId} 获取失败:`, error.message);
      }
      break;
  }

  return allResults;
}

async function collectHotspots(keyword) {
  const allResults = [];

  try {
    const weiboResults = await weiboService.searchWeibo(keyword, 5);
    allResults.push(...weiboResults);
  } catch (error) {
    console.error('微博搜索失败:', error.message);
  }

  try {
    const zhihuResults = await zhihuService.searchZhihu(keyword, 5);
    allResults.push(...zhihuResults);
  } catch (error) {
    console.error('知乎搜索失败:', error.message);
  }

  try {
    const biliResults = await bilibiliService.searchBilibili(keyword, 3);
    allResults.push(...biliResults);
  } catch (error) {
    console.error('B站搜索失败:', error.message);
  }

  try {
    const twitterResults = await twitterService.searchTweets(keyword, 5);
    allResults.push(...twitterResults);
  } catch (error) {
    console.error('Twitter搜索失败:', error.message);
  }

  return allResults;
}

async function discoverTrendingHotspots(category = 'AI编程') {
  console.log(`发现 ${category} 领域的热点...`);

  const allHotspots = dataService.getAllHotspots(200);

  const results = [];

  try {
    const weiboTrends = await weiboService.getWeiboTrending(5);
    results.push(...weiboTrends);
  } catch (error) {
    console.error('获取微博热搜失败:', error.message);
  }

  try {
    const zhihuHot = await zhihuService.getZhihuHot(5);
    results.push(...zhihuHot);
  } catch (error) {
    console.error('获取知乎热榜失败:', error.message);
  }

  try {
    const biliHot = await bilibiliService.getBilibiliHot(5);
    results.push(...biliHot);
  } catch (error) {
    console.error('获取B站热门失败:', error.message);
  }

  try {
    const rsshubTrends = await rssService.getTrendingFromRSSHUB(5);
    results.push(...rsshubTrends);
  } catch (error) {
    console.error('获取 RSSHub 热榜失败:', error.message);
  }

  try {
    const twitterTrends = await twitterService.getTrendingTopics();
    results.push(...twitterTrends.map(t => ({
      title: t.name,
      content: t.name,
      source: 'Twitter/X',
      platform: 'twitter',
      timestamp: new Date().toISOString(),
      keyword: 'Twitter热门',
      url: `https://twitter.com/search?q=${encodeURIComponent(t.name)}`,
      metrics: { views: t.tweet_volume || 0 },
      reliabilityScore: t.reliabilityScore || 70
    })));
  } catch (error) {
    console.error('获取Twitter热门失败:', error.message);
  }

  const deduplicated = deduplicationService.deduplicateAndMerge(results, allHotspots);

  for (const result of deduplicated) {
    const convertedResult = converterService.convertHotspotToSimplified(result);
    dataService.addHotspot(convertedResult);
  }

  return deduplicated;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  checkAllKeywords,
  checkKeyword,
  collectHotspots,
  collectAccountHotspots,
  discoverTrendingHotspots
};
