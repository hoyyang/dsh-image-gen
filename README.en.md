<div align="center">

# 🎨 dsh-image-gen

**A universal AI image generation plugin for DeepSeek Harness**

Any OpenAI-compatible image gateway · Visual settings-page configuration · One command to generate

[![Release](https://img.shields.io/github/v/release/hoyyang/dsh-image-gen?style=flat-square&label=release)](https://github.com/hoyyang/dsh-image-gen/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-plugin-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-5865F2?style=flat-square)](https://github.com/topics/dsh-plugin)

**🌐 Language / 语言**：[简体中文](README.md) · **English**

</div>

---

## What is this

dsh-image-gen lets DeepSeek Harness agents **generate images directly**:
any image gateway, any image model, configured with **three fields** — no code changes.

- 🎨 **One-command generation** — `/dsh-image-gen a cat sleeping on a windowsill` and it renders
- 🔌 **Any gateway** — any OpenAI-compatible image API (official, relays, one-api / new-api, …)
- 🎛 **Settings-page config** — save base URL / model / API key, applies **instantly**, no restart
- 🔒 **Secure by default** — secrets stay on this machine, output dir 0700, errors auto-redacted, nothing logged
- 💸 **Cost control** — one image per call; no automatic retries on failure

## Quick Start

> Prerequisites: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) installed (`dsh` on PATH).

**① Install**

```bash
dsh plugin --profile web add github:hoyyang/dsh-image-gen
```

Pin a version with a tag: `dsh plugin --profile web add github:hoyyang/dsh-image-gen#v0.2.2`

**② Configure** (30 seconds)

Restart `dsh web`, open **Settings → Plugins → dsh-image-gen**, fill in and save:

| Field | What to fill | Example |
| --- | --- | --- |
| Gateway base URL | Root of your image gateway (https) | `https://your-gateway.example.com/v1` |
| Model | Image model name your gateway accepts | `gpt-image-2` |
| API Key | Gateway secret | `sk-xxx` (stored locally only) |

**③ Generate**

Type in the input box:

```
/dsh-image-gen a cat sleeping on a windowsill, golden afternoon light, oil painting
```

Or just ask in conversation: “generate an image of …” — the agent calls the tool automatically.

## Triggers

| Surface | Example | When to use |
| --- | --- | --- |
| Command | `/dsh-image-gen <prompt> [--size=1024x1536] [--quality=high]` | Deterministic trigger, no model turn |
| Conversation | “Generate a cyberpunk city poster” | Let the model decide when to generate |
| Tool | `dsh_image_gen` | Scripting / manual invocation |
| Config check | `dsh_image_gen_config` | Free: validates config only, never bills |

Options: `--size=1024x1024｜1024x1536｜1536x1024｜auto`, `--quality=low｜medium｜high` (`--low/--medium/--high` shorthands).

## Configuration

Four ways, **first non-empty wins**: env vars > settings page > profile config > local file.

**1. Settings page (recommended)** — see Quick Start ②; visual, applies instantly.

**2. Environment variables**

```bash
export DSH_IMAGE_BASE_URL="https://your-gateway.example.com/v1"
export DSH_IMAGE_MODEL="gpt-image-2"
export DSH_IMAGE_API_KEY="sk-xxx"
```

**3. Profile config** — add a `config:` block to the plugin row in the profile `cordis.patch.yml` (commented example in [cordis.patch.yml](cordis.patch.yml)).

**4. Local file** — for UI-less profiles (file must be 0600):

```bash
cat > ~/.dsh/dsh-image-gen.json <<'EOF'
{
  "baseUrl": "https://your-gateway.example.com/v1",
  "model": "gpt-image-2",
  "apiKey": "sk-xxx"
}
EOF
chmod 600 ~/.dsh/dsh-image-gen.json
```

Other options:

| Option | Default | Notes |
| --- | --- | --- |
| imagesPath | `/images/generations` | Endpoint path (change it if your gateway differs) |
| outputDirectory | `~/.dsh/generated_images/dsh-image-gen/` | Output dir (0700) |
| timeoutMs | `300000` | Upstream timeout (ms) |

## Gateway contract

Any gateway speaking the OpenAI Images API shape works:

```
POST {baseUrl}/images/generations
Authorization: Bearer <API Key>
{ "model": "...", "prompt": "...", "n": 1, "size": "1024x1024", "quality": "high" }

Response: { "data": [ { "b64_json": "..." } ] }
```

Gateways returning a URL instead of `b64_json` are not supported yet (PRs welcome).

## Behavior

- **Paid & non-idempotent**: no automatic retries after timeouts or ambiguous failures — retry manually
- **One image per call**
- **Never touches the chat model**: the image gateway is separate config, DeepSeek Harness model routing is untouched

## FAQ

**Q: “No gateway base URL configured”?** A: None of the four config sources is set — run `dsh_image_gen_config` to see what is missing.

**Q: Settings changes not applied?** A: Settings-page saves apply instantly; env vars need a `dsh` restart.

**Q: My gateway model name has a prefix (e.g. `azure_openai/...`)?** A: Put the exact model name your gateway expects into the Model field — it is passed through verbatim.

**Q: Where are images saved?** A: `~/.dsh/generated_images/dsh-image-gen/` by default; the command/tool returns the full path.

## Development

```bash
pnpm install
bash scripts/build.sh   # tsc builds the host, tsdown bundles the client (lib/client.js)
```

## License

[MIT](LICENSE) © 2026 Hoy Yang
