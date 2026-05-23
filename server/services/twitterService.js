const axios = require('axios');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_URL = 'https://api.twitterapi.io/twitter';

// 过滤阈值配置（保守方案）
const MIN_LIKES = parseInt(process.env.TWITTER_MIN_LIKES) || 200;
const MIN_RETWEETS = parseInt(process.env.TWITTER_MIN_RETWEETS) || 50;
const MIN_REPLIES = parseInt(process.env.TWITTER_MIN_REPLIES) || 25;
const MIN_VIEWS = parseInt(process.env.TWITTER_MIN_VIEWS) || 5000;

// 高质量 AI 账号白名单（用户要求实现）
const VERIFIED_ACCOUNTS = [
  'OpenAI', 'DeepMind', 'AnthropicAI', 'GoogleAI', 'Microsoft',
  'metaai', 'xai', 'StabilityAI', 'huggingface', 'nvidia',
  'ylecun', 'karpathy', 'AndrewYNg', 'goodfellow_ian', 'hardmaru'
];

function isVerifiedAccount(tweet) {
  if (!tweet.author) return false;
  const username = tweet.author.userName || tweet.author.user_name || '';
  const name = tweet.author.name || '';
  return VERIFIED_ACCOUNTS.some(acc => 
    username.toLowerCase() === acc.toLowerCase() || 
    name.toLowerCase().includes(acc.toLowerCase())
  );
}

function meetsEngagementThreshold(tweet) {
  const likes = tweet.likeCount || tweet.like_count || 0;
  const retweets = tweet.retweetCount || tweet.retweet_count || 0;
  const replies = tweet.replyCount || tweet.reply_count || 0;
  const views = tweet.viewCount || tweet.view_count || 0;
  
  // 白名单账号适当放宽阈值
  const isVerified = isVerifiedAccount(tweet);
  const multiplier = isVerified ? 0.3 : 1;
  
  return likes >= MIN_LIKES * multiplier &&
         retweets >= MIN_RETWEETS * multiplier &&
         replies >= MIN_REPLIES * multiplier &&
         views >= MIN_VIEWS * multiplier;
}

function isReplyTweet(tweet) {
  return tweet.inReplyToId || tweet.in_reply_to_id || 
         tweet.inReplyToUserId || tweet.in_reply_to_user_id ||
         (tweet.text && tweet.text.startsWith('@'));
}

function calculateReliabilityScore(tweet) {
  let score = 50;
  
  // 白名单账号加分
  if (isVerifiedAccount(tweet)) score += 30;
  
  // 高互动加分
  const likes = tweet.likeCount || tweet.like_count || 0;
  const retweets = tweet.retweetCount || tweet.retweet_count || 0;
  if (likes > 500) score += 10;
  if (retweets > 100) score += 10;
  
  // 原创加分
  if (!tweet.retweetedTweet && !tweet.retweeted_tweet) score += 5;
  
  return Math.min(score, 100);
}

async function searchTweets(keyword, maxResults = 10) {
  if (!TWITTER_API_KEY) {
    console.log('Twitter API Key 未配置，跳过Twitter搜索');
    return [];
  }

  try {
    const response = await axios.get(`${TWITTER_API_URL}/tweet/advanced_search`, {
      params: {
        query: keyword,
        queryType: 'Top'  // 从 Latest 改为 Top
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY
      },
      timeout: 10000
    });

    const tweets = response.data.tweets || [];
    
    // 过滤逻辑
    const filtered = tweets
      .filter(tweet => !isReplyTweet(tweet))  // 排除纯回复
      .filter(tweet => meetsEngagementThreshold(tweet))  // 互动指标过滤
      .slice(0, maxResults);

    return filtered.map(tweet => ({
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      content: tweet.text,
      source: 'Twitter/X',
      timestamp: tweet.createdAt || new Date().toISOString(),
      keyword: keyword,
      metrics: {
        likes: tweet.likeCount || tweet.like_count || 0,
        retweets: tweet.retweetCount || tweet.retweet_count || 0,
        replies: tweet.replyCount || tweet.reply_count || 0,
        views: tweet.viewCount || tweet.view_count || 0
      },
      url: tweet.url || `https://twitter.com/i/web/status/${tweet.id}`,
      author: tweet.author ? {
        name: tweet.author.name,
        username: tweet.author.userName || tweet.author.user_name
      } : null,
      reliabilityScore: calculateReliabilityScore(tweet),
      isVerified: isVerifiedAccount(tweet)
    }));
  } catch (error) {
    console.error('Twitter搜索失败:', error.message);
    return [];
  }
}

async function getTrendingTopics() {
  if (!TWITTER_API_KEY) {
    return [];
  }

  try {
    const response = await axios.get(`${TWITTER_API_URL}/tweet/advanced_search`, {
      params: {
        query: 'AI OR GPT OR Claude OR LLM',
        queryType: 'Top'
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY
      },
      timeout: 10000
    });

    const tweets = response.data.tweets || [];
    
    // 同样过滤
    const filtered = tweets
      .filter(tweet => !isReplyTweet(tweet))
      .filter(tweet => meetsEngagementThreshold(tweet))
      .slice(0, 5);

    return filtered.map(tweet => ({
      name: tweet.text.substring(0, 50),
      tweet_volume: tweet.viewCount || tweet.view_count || 0,
      reliabilityScore: calculateReliabilityScore(tweet),
      isVerified: isVerifiedAccount(tweet)
    }));
  } catch (error) {
    console.error('获取Twitter趋势失败:', error.message);
    return [];
  }
}

module.exports = {
  searchTweets,
  getTrendingTopics,
  isVerifiedAccount,
  meetsEngagementThreshold
};
