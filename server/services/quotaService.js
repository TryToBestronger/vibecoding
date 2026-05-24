/**
 * 来源配额服务
 * 按来源分配条数上限，并支持单轮总上限截取
 */

const DEFAULT_QUOTAS = {
  weibo: 5,
  zhihu: 5,
  bilibili: 3,
  twitter: 5,
  rsshub: 5
};

const TOTAL_QUOTA = parseInt(process.env.QUOTA_TOTAL_PER_CYCLE, 10) || 20;

/**
 * 获取指定来源的配额上限
 * @param {string} source - 来源名称（如 weibo, zhihu）
 * @returns {number} 配额条数
 */
function getSourceQuota(source) {
  const envKey = `QUOTA_${source.toUpperCase()}`;
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return DEFAULT_QUOTAS[source.toLowerCase()] || 5;
}

/**
 * 对单个来源的结果做配额截取
 * @param {Array} results - 该来源的结果
 * @param {string} source - 来源名称
 * @returns {Array} 截取后的结果
 */
function applySourceQuota(results, source) {
  if (!Array.isArray(results) || results.length === 0) {
    return results;
  }

  const quota = getSourceQuota(source);
  if (results.length <= quota) {
    return results;
  }

  const sliced = results.slice(0, quota);
  console.log(`[来源配额] ${source}: ${results.length} → ${sliced.length}（上限 ${quota}）`);
  return sliced;
}

/**
 * 对全部来源合并后的结果做总量截取
 * @param {Array} results - 合并后的结果
 * @returns {Array} 截取后的结果
 */
function applyTotalQuota(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return results;
  }

  if (results.length <= TOTAL_QUOTA) {
    return results;
  }

  const sliced = results.slice(0, TOTAL_QUOTA);
  console.log(`[总配额] ${results.length} → ${sliced.length}（上限 ${TOTAL_QUOTA}）`);
  return sliced;
}

module.exports = {
  getSourceQuota,
  applySourceQuota,
  applyTotalQuota
};
