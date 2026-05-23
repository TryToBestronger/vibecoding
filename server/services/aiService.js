const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

async function analyzeContent(content, keyword) {
  if (!DEEPSEEK_API_KEY) {
    console.log('DeepSeek API Key 未配置，跳过AI分析');
    return { isRelevant: true, confidence: 70, reason: 'AI未配置，默认通过' };
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的内容分析助手，负责识别内容是否真实相关，并过滤掉假冒、无关的信息。'
          },
          {
            role: 'user',
            content: `请分析以下内容是否真实与关键词"${keyword}"相关，是否是有价值的热点信息。内容：${content}\n\n请返回JSON格式：{"isRelevant": true/false, "confidence": 0-100, "reason": "原因"}`
          }
        ],
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    let result = response.data.choices[0].message.content;
    
    result = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    try {
      return JSON.parse(result);
    } catch (parseError) {
      console.error('JSON解析失败:', result);
      return { isRelevant: true, confidence: 50, reason: 'AI分析失败，默认通过' };
    }
  } catch (error) {
    console.error('AI分析失败:', error.message);
    if (error.response?.status === 429) {
      console.log('AI请求频率限制，跳过此次分析');
      return { isRelevant: true, confidence: 65, reason: 'AI请求过于频繁，默认通过' };
    }
    return { isRelevant: true, confidence: 50, reason: 'AI分析失败，默认通过' };
  }
}

async function summarizeHotspots(hotspots) {
  if (!DEEPSEEK_API_KEY) {
    return '总结功能需要配置DeepSeek API Key';
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的热点分析助手，负责总结和提炼热点信息。'
          },
          {
            role: 'user',
            content: `请总结以下热点信息，提取关键要点：\n${JSON.stringify(hotspots, null, 2)}`
          }
        ],
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI总结失败:', error.message);
    return '总结生成失败';
  }
}

module.exports = {
  analyzeContent,
  summarizeHotspots
};
