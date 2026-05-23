// 自实现文本相似度计算（不依赖外部包）

const SIMILARITY_THRESHOLD = 0.65;

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
    .trim();
}

function getBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

function calculateSimilarity(title1, title2) {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);
  
  if (!normalized1 || !normalized2) return 0;
  if (normalized1 === normalized2) return 1.0;
  
  // 使用 bigram 交集计算相似度
  const bigrams1 = getBigrams(normalized1);
  const bigrams2 = getBigrams(normalized2);
  
  const set1 = new Set(bigrams1);
  const set2 = new Set(bigrams2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function isDuplicate(newHotspot, existingHotspots) {
  for (const existing of existingHotspots) {
    const titleSimilarity = calculateSimilarity(newHotspot.title, existing.title);
    
    if (titleSimilarity >= SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        matchedWith: existing,
        similarity: titleSimilarity
      };
    }
    
    // 如果 URL 相同，也认为是重复
    if (newHotspot.url && existing.url && newHotspot.url === existing.url) {
      return {
        isDuplicate: true,
        matchedWith: existing,
        similarity: 1.0
      };
    }
  }
  
  return { isDuplicate: false };
}

/**
 * 去重并合并来源标签（方案A）
 */
function deduplicateAndMerge(hotspots, existingHotspots) {
  const result = [];
  const mergedIds = new Set();
  
  for (const hotspot of hotspots) {
    if (mergedIds.has(hotspot.id || hotspot._id)) continue;
    
    const duplicateCheck = isDuplicate(hotspot, [...existingHotspots, ...result]);
    
    if (duplicateCheck.isDuplicate) {
      // 合并来源标签
      const existing = duplicateCheck.matchedWith;
      
      if (!existing.sources) {
        existing.sources = [existing.source].filter(Boolean);
      }
      
      if (hotspot.source && !existing.sources.includes(hotspot.source)) {
        existing.sources.push(hotspot.source);
      }
      
      // 保留更权威/更早的来源作为 main source
      if (hotspot.reliabilityScore && existing.reliabilityScore) {
        if (hotspot.reliabilityScore > existing.reliabilityScore) {
          existing.source = hotspot.source;
          existing.reliabilityScore = hotspot.reliabilityScore;
        }
      }
      
      // 合并 metrics
      if (hotspot.metrics) {
        existing.metrics = { ...existing.metrics, ...hotspot.metrics };
      }
      
      // 合并 URLs
      if (!existing.sourceUrls) {
        existing.sourceUrls = existing.url ? [existing.url] : [];
      }
      if (hotspot.url && !existing.sourceUrls.includes(hotspot.url)) {
        existing.sourceUrls.push(hotspot.url);
      }
      
      mergedIds.add(hotspot.id || hotspot._id);
    } else {
      // 新热点，初始化 sources 数组
      const newHotspot = {
        ...hotspot,
        sources: [hotspot.source].filter(Boolean)
      };
      if (hotspot.url) {
        newHotspot.sourceUrls = [hotspot.url];
      }
      result.push(newHotspot);
    }
  }
  
  return result;
}

function checkDuplicate(hotspot, existingHotspots) {
  return isDuplicate(hotspot, existingHotspots);
}

module.exports = {
  calculateSimilarity,
  isDuplicate,
  deduplicateAndMerge,
  checkDuplicate
};
