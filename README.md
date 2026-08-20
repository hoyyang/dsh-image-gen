<div align="center">

# 🎨 dsh-image-gen

**DeepSeek Harness 的通用 AI 生图插件**

接入任意 OpenAI 兼容生图网关 · 设置页可视化配置 · 一句话出图

[![Release](https://img.shields.io/github/v/release/hoyyang/dsh-image-gen?style=flat-square&label=release)](https://github.com/hoyyang/dsh-image-gen/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-plugin-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-5865F2?style=flat-square)](https://github.com/topics/dsh-plugin)

**🌐 Language / 语言**：**简体中文** · [English](README.en.md)

</div>

---

## 这是什么

dsh-image-gen 让 DeepSeek Harness 的智能体**直接生成图片**：
任意生图网关、任意生图模型，**三个字段**配好即可用，无需改任何代码。

- 🎨 **一句话出图** —— `/dsh-image-gen 一只趴在窗台上的橘猫`，即调即出
- 🔌 **任意网关** —— OpenAI 兼容的生图 API 都能接（官方、中转、one-api / new-api 等）
- 🎛 **设置页配置** —— 填 baseUrl / 模型 / API Key，保存后**即时生效**，不用重启
- 🔒 **安全默认** —— 密钥只存本机、出图目录 0700、错误自动脱敏、不写日志
- 💸 **费用可控** —— 每次调用只生成一张图；失败不自动重试

## 快速开始

> 前提：已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` 命令可用）。

**① 安装**

```bash
dsh plugin --profile web add github:hoyyang/dsh-image-gen
```

锁版本可加标签：`dsh plugin --profile web add github:hoyyang/dsh-image-gen#v0.2.2`

**② 配置**（30 秒）

重启 `dsh web` 后，打开 **设置 → 插件 → dsh-image-gen**，填三样保存：

| 字段 | 填什么 | 示例 |
| --- | --- | --- |
| 网关 base URL | 生图网关的根地址（https） | `https://你的网关.example.com/v1` |
| 模型 | 网关接受的生图模型名 | `gpt-image-2` |
| API Key | 网关密钥 | `sk-xxx`（仅存本机） |

**③ 出图**

在输入框输入：

```
/dsh-image-gen 一只趴在窗台上的橘猫，午后阳光，油画风格
```

也可以直接对话：「帮我生成一张 xx 的图」，智能体会自动调用工具。

## 使用方式

| 方式 | 示例 | 适用场景 |
| --- | --- | --- |
| 命令 | `/dsh-image-gen <描述> [--size=1024x1536] [--quality=high]` | 确定性触发，不经模型回合 |
| 对话 | 「生成一张赛博朋克城市海报」 | 让模型自己决定何时出图 |
| 工具 | `dsh_image_gen` | 脚本化 / 手动调用 |
| 配置检查 | `dsh_image_gen_config` | 免费：只查配置，不产生账单 |

参数：`--size=1024x1024｜1024x1536｜1536x1024｜auto`，`--quality=low｜medium｜high`（`--low/--medium/--high` 可简写）。

## 配置

四种方式任选其一，**优先级从高到低**：环境变量 > 设置页 > profile 配置 > 本地文件。

**方式一：设置页（推荐）** —— 见「快速开始 ②」，可视化、即时生效。

**方式二：环境变量**

```bash
export DSH_IMAGE_BASE_URL="https://你的网关.example.com/v1"
export DSH_IMAGE_MODEL="gpt-image-2"
export DSH_IMAGE_API_KEY="sk-xxx"
```

**方式三：profile 配置** —— 在 profile 的 `cordis.patch.yml` 中给插件行加 `config:` 块（见仓库内 [cordis.patch.yml](cordis.patch.yml) 的注释示例）。

**方式四：本地文件** —— 适合无 UI 的 profile（文件权限须 0600）：

```bash
cat > ~/.dsh/dsh-image-gen.json <<'EOF'
{
  "baseUrl": "https://你的网关.example.com/v1",
  "model": "gpt-image-2",
  "apiKey": "sk-xxx"
}
EOF
chmod 600 ~/.dsh/dsh-image-gen.json
```

其余可选项：

| 项 | 默认值 | 说明 |
| --- | --- | --- |
| imagesPath | `/images/generations` | 生图接口路径（个别网关路径不同时改它） |
| outputDirectory | `~/.dsh/generated_images/dsh-image-gen/` | 出图目录（0700） |
| timeoutMs | `300000` | 上游超时（毫秒） |

## 接入契约（写给网关）

只要你的网关支持 OpenAI Images API 形状即可接入：

```
POST {baseUrl}/images/generations
Authorization: Bearer <API Key>
{ "model": "...", "prompt": "...", "n": 1, "size": "1024x1024", "quality": "high" }

响应: { "data": [ { "b64_json": "..." } ] }
```

返回 URL 而非 `b64_json` 的网关暂不支持（欢迎 PR）。

## 行为边界

- **付费且非幂等**：超时或网络歧义失败后不会自动重试——重试请手动发起
- **一次一张**：单次调用只生成一张图
- **不动主模型**：生图网关独立配置，不影响 DeepSeek Harness 的聊天模型路由

## 常见问题

**Q：报「No gateway base URL configured」？** A：四种配置方式都没生效，先跑 `dsh_image_gen_config` 看具体缺什么。

**Q：改了设置页没生效？** A：设置页保存即时生效；环境变量改完需重启 `dsh`。

**Q：网关模型名带前缀（如 `azure_openai/...`）？** A：把网关要求的完整模型名填进「模型」字段即可，插件原样透传。

**Q：图存到哪了？** A：默认 `~/.dsh/generated_images/dsh-image-gen/`，生成后命令/工具会返回完整路径。

## 开发

```bash
pnpm install
bash scripts/build.sh   # tsc 编译 host + tsdown 打包 client（lib/client.js）
```

## License

[MIT](LICENSE) © 2026 Hoy Yang
