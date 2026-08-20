# @dsh-external/dsh-image-gen

DSH 通用图像生成插件：接入任意 **OpenAI 兼容生图网关**（自定义 baseUrl + 模型 + API Key），
设置页可视化配置，开箱即可用。任何生图模型都行——只要网关接受 OpenAI Images API 形状的请求。

## 触发方式

| 方式 | 说明 |
| --- | --- |
| 命令（确定性触发） | `/dsh-image-gen <prompt> [--size=1024x1024\|1024x1536\|1536x1024\|auto] [--quality=low\|medium\|high]`——直接生成，不经模型回合；`--low/--medium/--high` 是质量快捷写法 |
| 工具（模型调用） | `dsh_image_gen`（生成）/ `dsh_image_gen_config`（本地配置检查，免费、不发请求） |
| skill | `dsh-image-gen`——引导模型何时使用上述工具 |

## 安装

```bash
dsh plugin --profile web add github:hoyyang/dsh-image-gen
# 重启 dsh web 生效（bundles 层自动装配）。锁版本：...#v0.2.0
```

## 配置（按优先级，第一个非空生效）

1. **设置页（推荐）**：DSH Web 设置 → 插件 → `dsh-image-gen` 卡片，填 baseUrl / 模型 / API Key 保存，**即时生效**。
2. **环境变量**：`DSH_IMAGE_BASE_URL` / `DSH_IMAGE_MODEL` / `DSH_IMAGE_API_KEY` / `DSH_IMAGE_IMAGES_PATH` / `DSH_IMAGE_OUTPUT_DIR` / `DSH_IMAGE_TIMEOUT_MS`。
3. **profile 配置行**：cordis.patch.yml 中 bundle 行的 `config:` 块（见仓库内 cordis.patch.yml 注释示例）。
4. **本地文件**：`~/.dsh/dsh-image-gen.json`（须 0600、本人所有）：
   ```json
   { "baseUrl": "https://你的网关/v1", "model": "你的生图模型名", "apiKey": "你的密钥" }
   ```

| 项 | 默认值 | 说明 |
| --- | --- | --- |
| baseUrl | 无（必填） | 网关根地址，必须 https |
| model | `gpt-image-2` | 网关接受的生图模型名，任意 |
| imagesPath | `/images/generations` | 生图接口路径 |
| apiKey | 无（必填） | 网关密钥，仅存本机 |
| outputDirectory | `~/.dsh/generated_images/dsh-image-gen/`（0700） | 出图目录 |
| timeoutMs | 300000 | 上游超时 |

## 接入契约

网关需支持 OpenAI Images API 形状：`POST {baseUrl}{imagesPath}`，请求体
`{ model, prompt, n: 1, size, quality }` + Bearer 鉴权，响应 `data[0].b64_json`。
（one-api/new-api、各类中转、官方 OpenAI 等均适用；返回 url 而非 b64_json 的网关暂不支持。）

## 行为边界

- 每次调用只生成一张图；付费且非幂等——超时/歧义网络失败后**不自动重试**。
- 出图目录 0700、原子写入、API Key 脱敏、响应体大小限制、base64/魔数校验。
- 不改动 DSH 主模型路由（生图网关是独立配置）。

## 开发

```bash
pnpm install
bash scripts/build.sh   # tsc 编译 host + tsdown 打包 client（lib/client.js）
```
