const axios = require('axios');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_URL = 'https://api.twitterapi.io/twitter';

async function searchTweets(keyword, maxResults = 10) {
  if (!TWITTER_API_KEY) {
    console.log('Twitter API Key 未配置，跳过Twitter搜索');
    return [];
  }

  try {
    const response = await axios.get(`${TWITTER_API_URL}/tweet/advanced_search`, {
      params: {
        query: keyword,
        queryType: 'Latest'
      },
      headers: {
        'X-API-Key': TWITTER_API_KEY
      },
      timeout: 10000
    });

    const tweets = response.data.tweets || [];
    return tweets.slice(0, maxResults).map(tweet => ({
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      content: tweet.text,
      source: 'Twitter/X',
      timestamp: tweet.createdAt,
      keyword: keyword,
      metrics: {
        likes: tweet.likeCount || 0,
        retweets: tweet.retweetCount || 0,
        replies: tweet.replyCount || 0,
        views: tweet.viewCount || 0
      },
      url: tweet.url || `https://twitter.com/i/web/status/${tweet.id}`
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
    return tweets.slice(0, 5).map(tweet => ({
      name: tweet.text.substring(0, 50),
      tweet_volume: tweet.viewCount || 0
    }));
  } catch (error) {
    console.error('获取Twitter趋势失败:', error.message);
    return [];
  }
}

module.exports = {
  searchTweets,
  getTrendingTopics
};
