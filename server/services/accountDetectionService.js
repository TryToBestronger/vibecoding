const AI_KEYWORDS = ['AI', '人工智能', '大模型', 'GPT', 'Claude', 'LLM', '深度学习', '机器学习', 'AIGC',
  'OpenAI', 'DeepSeek', 'Gemini', '通义', '文心', '智谱', 'Stable Diffusion', 'Midjourney',
  'Sora', 'AGI', 'Copilot', '自动驾驶', 'ChatGPT', 'Transformer', 'Diffusion'];

function detectAccountType(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return { type: 'keyword', keyword: keyword, platform: null };
  }

  const trimmed = keyword.trim();

  if (trimmed.startsWith('@')) {
    return {
      type: 'account',
      platform: 'weibo',
      accountId: trimmed.substring(1),
      accountName: trimmed,
      displayName: `微博 @${trimmed.substring(1)}`
    };
  }

  const uidMatch = trimmed.match(/^UID[:：](\d+)$/i);
  if (uidMatch) {
    return {
      type: 'account',
      platform: 'bilibili',
      accountId: uidMatch[1],
      accountName: trimmed,
      displayName: `B站 UP主 ${uidMatch[1]}`
    };
  }

  if (trimmed.startsWith('知乎:') || trimmed.startsWith('知乎：')) {
    return {
      type: 'account',
      platform: 'zhihu',
      accountId: trimmed.replace(/^知乎[:：]\s*/, ''),
      accountName: trimmed,
      displayName: `知乎 ${trimmed.replace(/^知乎[:：]\s*/, '')}`
    };
  }

  if (trimmed.startsWith('微博:') || trimmed.startsWith('微博：')) {
    return {
      type: 'account',
      platform: 'weibo',
      accountId: trimmed.replace(/^微博[:：]\s*/, '').replace(/^@/, ''),
      accountName: trimmed,
      displayName: `微博 ${trimmed.replace(/^微博[:：]\s*/, '')}`
    };
  }

  if (trimmed.startsWith('B站:') || trimmed.startsWith('B站：') ||
      trimmed.startsWith('bilibili:') || trimmed.startsWith('bilibili：')) {
    return {
      type: 'account',
      platform: 'bilibili',
      accountId: trimmed.replace(/^(B站|bilibili)[:：]\s*/i, ''),
      accountName: trimmed,
      displayName: `B站 ${trimmed.replace(/^(B站|bilibili)[:：]\s*/i, '')}`
    };
  }

  return { type: 'keyword', keyword: trimmed, platform: null };
}

function isAIKeyword(keyword) {
  const upper = keyword.toUpperCase();
  return AI_KEYWORDS.some(k => upper.includes(k.toUpperCase()));
}

module.exports = {
  detectAccountType,
  isAIKeyword
};
