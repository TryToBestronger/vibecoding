/**
 * 时间窗口过滤服务
 * 丢弃超过 maxAgeHours 的内容条目
 */

const MAX_CONTENT_AGE_HOURS = parseInt(process.env.MAX_CONTENT_AGE_HOURS, 10) || 48;

/**
 * 按时间窗口过滤结果
 * @param {Array} results - 结果列表
 * @param {number} [maxAgeHours] - 最大允许时长（小时），默认读取环境变量
 * @returns {Array} 过滤后的结果
 */
function filterByTimeWindow(results, maxAgeHours = MAX_CONTENT_AGE_HOURS) {
  if (!Array.isArray(results) || results.length === 0) {
    return results;
  }

  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const filtered = results.filter(item => {
    if (!item.timestamp) return true;
    const ts = new Date(item.timestamp).getTime();
    return !isNaN(ts) && ts >= cutoff;
  });

  const dropped = results.length - filtered.length;
  if (dropped > 0) {
    console.log(`[时间过滤] 丢弃 ${dropped} 条超过 ${maxAgeHours} 小时的内容`);
  }

  return filtered;
}

module.exports = {
  filterByTimeWindow
};
