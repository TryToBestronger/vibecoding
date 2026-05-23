const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const CONFIDENCE_THRESHOLD = parseInt(process.env.AI_CONFIDENCE_THRESHOLD) || 85;

async function analyzeContent(content, keyword) {
  if (!DEEPSEEK_API_KEY) {
    console.log('DeepSeek API Key 未配置，跳过AI分析');
    return { 
      isRelevant: true, 
      confidence: 70, 
      reason: 'AI未配置，默认通过',
      qualityScore: 50,
      sourceReliability: 50,
      timeliness: 50
    };
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的内容分析助手，负责识别内容是否真实相关，并过滤掉假冒、无关的信息。

分析维度：
1. **相关性(isRelevant)**：内容是否真实与关键词相关，而非标题党或蹭热度
2. **置信度(confidence)**：0-100，对判断的确定程度
3. **内容质量(qualityScore)**：0-100，评估内容深度、信息量、实用价值
4. **信息源可靠性(sourceReliability)**：0-100，信息源是否权威可信
5. **时效性(timeliness)**：0-100，内容是否新鲜、及时

请严格过滤以下低质量内容：
- 营销软文、广告推广
- 重复内容或炒冷饭
- 低质量讨论、无实质信息
- 明显假冒或误导性信息
- 纯情绪化表达，无事实依据

返回严格的JSON格式，不要有其他文字。`
          },
          {
            role: 'user',
            content: `请分析以下内容是否真实与关键词"${keyword}"相关，是否是有价值的热点信息。

内容：${content}

请返回JSON格式（不要有其他文字）：
{"isRelevant": true/false, "confidence": 0-100, "qualityScore": 0-100, "sourceReliability": 0-100, "timeliness": 0-100, "reason": "分析原因"}`
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
      const parsed = JSON.parse(result);
      
      // 确保所有字段都存在
      return {
        isRelevant: parsed.isRelevant ?? true,
        confidence: parsed.confidence ?? 50,
        qualityScore: parsed.qualityScore ?? 50,
        sourceReliability: parsed.sourceReliability ?? 50,
        timeliness: parsed.timeliness ?? 50,
        reason: parsed.reason || '无分析原因'
      };
    } catch (parseError) {
      console.error('JSON解析失败:', result);
      return { 
        isRelevant: true, 
        confidence: 50, 
        qualityScore: 50,
        sourceReliability: 50,
        timeliness: 50,
        reason: 'AI分析结果解析失败，默认通过' 
      };
    }
  } catch (error) {
    console.error('AI分析失败:', error.message);
    if (error.response?.status === 429) {
      console.log('AI请求频率限制，跳过此次分析');
      return { 
        isRelevant: true, 
        confidence: 65, 
        qualityScore: 50,
        sourceReliability: 50,
        timeliness: 50,
        reason: 'AI请求过于频繁，默认通过' 
      };
    }
    return { 
      isRelevant: true, 
      confidence: 50, 
      qualityScore: 50,
      sourceReliability: 50,
      timeliness: 50,
      reason: 'AI分析失败，默认通过' 
    };
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

function getConfidenceThreshold() {
  return CONFIDENCE_THRESHOLD;
}

module.exports = {
  analyzeContent,
  summarizeHotspots,
  getConfidenceThreshold
};
