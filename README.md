# AI热点监控平台

🔥 自动发现和监控AI领域热点，走在吃瓜第一线！

## 功能特点

- ✅ **关键词监控**：手动输入关键词，自动监控相关热点
- 🔍 **智能发现**：自动搜集指定范围内的热点信息
- 🤖 **AI识别**：利用OpenRouter AI识别和过滤假冒内容
- 🔔 **实时通知**：第一时间发送热点通知
- 📊 **多信息源**：整合Twitter/X、网页搜索等多个数据源
- 🎨 **独特设计**：渐变色、玻璃态效果、响应式布局

## 快速开始

### 1. 安装依赖

在项目根目录下运行：

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入您的API密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3000
TWITTER_API_KEY=your_twitter_api_key_here
```

#### 获取API密钥

- **OpenRouter API Key**：访问 https://openrouter.ai/ 注册并获取API密钥
- **Twitter API Key**：访问 https://twitterapi.io/ 获取API密钥（可选）

### 3. 启动服务

```bash
npm start
```

服务将在 http://localhost:3000 启动

## 项目结构

```
ai热点监控平台/
├── server/                 # 后端服务
│   ├── routes/            # API路由
│   │   ├── keywords.js    # 关键词管理
│   │   └── hotspots.js    # 热点管理
│   ├── services/          # 业务逻辑
│   │   ├── aiService.js           # OpenRouter AI集成
│   │   ├── twitterService.js      # Twitter API集成
│   │   ├── webScraperService.js   # 网页爬虫
│   │   ├── monitorService.js      # 监控服务
│   │   └── dataService.js         # 数据存储
│   └── index.js           # 服务入口
├── public/                # 前端页面
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   └── app.js             # 前端逻辑
├── data/                  # 数据存储（自动创建）
│   ├── keywords.json      # 关键词数据
│   ├── hotspots.json      # 热点数据
│   └── notifications.json # 通知数据
├── .env                   # 环境变量配置
└── package.json           # 项目配置
```

## API接口

### 关键词管理

- `GET /api/keywords` - 获取所有关键词
- `POST /api/keywords` - 添加关键词
- `PUT /api/keywords/:id` - 更新关键词
- `DELETE /api/keywords/:id` - 删除关键词
- `POST /api/keywords/:id/check` - 立即检查关键词

### 热点管理

- `GET /api/hotspots` - 获取热点列表
- `POST /api/hotspots/discover` - 发现新热点
- `GET /api/hotspots/notifications` - 获取通知列表
- `PUT /api/hotspots/notifications/:id/read` - 标记通知已读

## 使用说明

### 添加监控关键词

1. 点击"+ 添加关键词"按钮
2. 输入要监控的关键词（如：GPT-5, Claude 4）
3. 选择分类（如：AI编程）
4. 确认添加

### 发现热点

点击"🔍 发现热点"按钮，系统将自动从多个信息源搜集最新热点。

### 查看通知

点击右上角的通知图标🔔，查看所有热点通知。

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生HTML + CSS + JavaScript
- **AI服务**：OpenRouter API
- **数据源**：Twitter/X API、网页爬虫
- **定时任务**：node-cron（每30分钟自动检查）

## 注意事项

1. **API频率限制**：网页爬虫设置了5秒的最小请求间隔，避免被封禁
2. **AI配置**：如果未配置OpenRouter API Key，AI分析功能将被跳过
3. **Twitter API**：如果未配置Twitter API Key，将只使用网页搜索
4. **数据存储**：使用JSON文件存储，适合轻量级使用

## 下一步开发

- [ ] 封装为Agent Skills技能
- [ ] 添加更多数据源（Reddit、GitHub Trending等）
- [ ] 支持邮件/微信通知
- [ ] 数据可视化图表
- [ ] 热点趋势分析

## 许可证

MIT License
