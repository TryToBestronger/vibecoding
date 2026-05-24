---
name: 时间过滤与配额策略
overview: 新增 48 小时时间窗口过滤器和按来源的配额分配服务，并将两者集成到监控主管道中，所有参数均通过环境变量配置。
todos:
  - id: create-time-filter
    content: 新建 server/services/timeFilterService.js，实现 filterByTimeWindow 函数
    status: pending
  - id: create-quota-service
    content: 新建 server/services/quotaService.js，实现来源配额与总配额逻辑
    status: pending
  - id: update-monitor-service
    content: 修改 monitorService.js，集成时间过滤和配额到三个采集函数
    status: pending
  - id: update-env-example
    content: 追加 .env.example 中时间窗口和配额相关配置项
    status: pending
isProject: false
---

# 时间过滤 + 配额分配策略计划

## 背景

当前管道无时间截止逻辑，也无正式的来源配额，固定数量硬编码于 `monitorService.js`。需要在以下位置插入新逻辑：

```
采集结果
  → [NEW] 时间过滤（丢弃 >48h 内容）
  → [NEW] 来源配额截取（每源上限）
  → [NEW] 总配额截取（单轮总上限）
  → 去重 → 繁简转换 → AI 分析 → 入库
```

---

## 变更文件清单

### 1. 新建 `server/services/timeFilterService.js`

核心导出：`filterByTimeWindow(results, maxAgeHours)`

- 读取 `MAX_CONTENT_AGE_HOURS`（默认 48）
- 以 `item.timestamp` 与当前时间比较，超出则丢弃
- 无 `timestamp` 字段的条目保留（热榜等无明确发布时间）
- 打印丢弃数量日志

```js
// 关键逻辑示意
const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
return results.filter(item => {
  if (!item.timestamp) return true;
  return new Date(item.timestamp).getTime() >= cutoff;
});
```

### 2. 新建 `server/services/quotaService.js`

核心导出：`getSourceQuota(source)`、`applySourceQuota(results, source)`、`applyTotalQuota(results)`

- 从 env 读取每个来源的独立配额（默认值见下）
- `applySourceQuota`：按来源名称截取，超出配额时打印日志
- `applyTotalQuota`：对全部来源合并后的结果做总量截取

来源配额默认值：

- `QUOTA_WEIBO=5` 微博
- `QUOTA_ZHIHU=5` 知乎
- `QUOTA_BILIBILI=3` B 站
- `QUOTA_TWITTER=5` Twitter/X
- `QUOTA_RSSHUB=5` RSSHub 热榜
- `QUOTA_TOTAL_PER_CYCLE=20` 单轮总上限

### 3. 修改 `server/services/monitorService.js`

- 引入 `timeFilterService` 和 `quotaService`
- `collectHotspots(keyword)` 中：将各平台 `maxResults` 参数由硬编码改为 `getSourceQuota(source)`；全部来源采集完毕后依次调用 `filterByTimeWindow` → `applyTotalQuota`
- `collectAccountHotspots(accountInfo)` 中：返回前调用 `filterByTimeWindow`
- `discoverTrendingHotspots()` 中：`deduplicateAndMerge` 之前调用 `filterByTimeWindow` + 各来源 `applySourceQuota`

变更位置示意（`monitorService.js`）：

```js
// collectHotspots 末尾
const timeFiltered = timeFilterService.filterByTimeWindow(allResults);
return quotaService.applyTotalQuota(timeFiltered);

// 各平台调用改为
const weiboResults = await weiboService.searchWeibo(
  keyword, quotaService.getSourceQuota('weibo')
);
```

### 4. 修改 `.env.example`

追加时间窗口与配额配置段：

```
# 时间窗口过滤（超过此时长（小时）的内容将被丢弃）
MAX_CONTENT_AGE_HOURS=48

# 每轮检查各来源的配额上限（条数）
QUOTA_WEIBO=5
QUOTA_ZHIHU=5
QUOTA_BILIBILI=3
QUOTA_TWITTER=5
QUOTA_RSSHUB=5
# 单轮所有来源合并后的总条数上限
QUOTA_TOTAL_PER_CYCLE=20
```

---

## 执行顺序

1. 新建 `timeFilterService.js`
2. 新建 `quotaService.js`
3. 修改 `monitorService.js`（逐函数修改：`collectHotspots` → `collectAccountHotspots` → `discoverTrendingHotspots`）
4. 追加 `.env.example` 配置项
