const axios = require('axios');
const crypto = require('crypto');

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedKeys = null;
let cacheTime = 0;

function extractKeyFromUrl(url) {
  const filename = url.slice(url.lastIndexOf('/') + 1);
  return filename.slice(0, filename.indexOf('.'));
}

function getMixinKey(rawKey) {
  return MIXIN_KEY_ENC_TAB.map(index => rawKey[index]).join('').slice(0, 32);
}

function signParams(params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey + subKey);
  const wts = Math.round(Date.now() / 1000);
  const sanitized = { ...params, wts };
  const chrFilter = /[!'()*]/g;

  const query = Object.keys(sanitized)
    .sort()
    .map(key => {
      const value = String(sanitized[key]).replace(chrFilter, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  const w_rid = crypto.createHash('md5').update(query + mixinKey).digest('hex');
  return { ...sanitized, w_rid };
}

async function getWbiKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedKeys;
  }

  const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com'
    },
    timeout: 15000
  });

  const wbiImg = response.data?.data?.wbi_img;
  if (!wbiImg?.img_url || !wbiImg?.sub_url) {
    throw new Error('无法获取 B站 WBI 密钥');
  }

  cachedKeys = {
    imgKey: extractKeyFromUrl(wbiImg.img_url),
    subKey: extractKeyFromUrl(wbiImg.sub_url)
  };
  cacheTime = Date.now();
  return cachedKeys;
}

function clearCache() {
  cachedKeys = null;
  cacheTime = 0;
}

module.exports = {
  getWbiKeys,
  signParams,
  clearCache
};
