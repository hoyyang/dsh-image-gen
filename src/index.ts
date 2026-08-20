import type { Context } from '@deepseek-ai/cordis'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import { lstatSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import {
  DEFAULT_IMAGES_PATH,
  DEFAULT_MODEL,
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_QUALITY,
  DEFAULT_SIZE,
  DEFAULT_TIMEOUT_MS,
  QUALITIES,
  SIZES,
  checkConfiguration,
  generateImage,
  sanitizeError,
  type DshImageGenConfig,
  type ImageQuality,
  type ImageSize,
} from './image-service.js'

export const name = '@dsh-external/dsh-image-gen'
export const inject = ['tools', 'skills', 'commands']

export interface Config {
  baseUrl: string
  model: string
  imagesPath: string
  apiKey: string
  outputDirectory: string
  timeoutMs: number
}

export const Config = z.object({
  baseUrl: z.string().default(''),
  model: z.string().default(''),
  imagesPath: z.string().default(DEFAULT_IMAGES_PATH),
  apiKey: z.string().default(''),
  outputDirectory: z.string().default(''),
  timeoutMs: z.number().min(1000).default(DEFAULT_TIMEOUT_MS),
})

/** Settings namespace persisted by the DSH settings store (editable in the web UI Plugins page). */
export const SETTINGS_NS = 'dsh-image-gen'

const LOCAL_CONFIG_FILE = path.join(homedir(), '.dsh', 'dsh-image-gen.json')

function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

interface LocalConfigFile {
  baseUrl?: string
  model?: string
  imagesPath?: string
  apiKey?: string
  outputDirectory?: string
  timeoutMs?: number
}

/**
 * Optional local fallback file (~/.dsh/dsh-image-gen.json, mode 0600).
 * Never blocks startup: unreadable/insecure files are ignored.
 */
function readLocalConfigFile(): LocalConfigFile {
  try {
    const stat = lstatSync(LOCAL_CONFIG_FILE)
    if (!stat.isFile() || stat.isSymbolicLink()) return {}
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return {}
    if ((Number(stat.mode) & 0o077) !== 0) return {}
    const parsed = JSON.parse(readFileSync(LOCAL_CONFIG_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return ''
}

function resolveConfig(cordis: Config, settings: Partial<Config> = {}, file: LocalConfigFile = {}): DshImageGenConfig {
  const timeoutRaw = env('DSH_IMAGE_TIMEOUT_MS')
  const timeoutMs = timeoutRaw && Number(timeoutRaw) >= 1000
    ? Number(timeoutRaw)
    : settings.timeoutMs ?? cordis.timeoutMs ?? file.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const outputDirectory = firstNonEmpty(
    env('DSH_IMAGE_OUTPUT_DIR'),
    settings.outputDirectory,
    cordis.outputDirectory,
    file.outputDirectory,
  ) || DEFAULT_OUTPUT_DIRECTORY
  const baseUrl = firstNonEmpty(env('DSH_IMAGE_BASE_URL'), settings.baseUrl, cordis.baseUrl, file.baseUrl)
  return {
    baseUrl,
    model: firstNonEmpty(env('DSH_IMAGE_MODEL'), settings.model, cordis.model, file.model) || DEFAULT_MODEL,
    imagesPath: firstNonEmpty(env('DSH_IMAGE_IMAGES_PATH'), settings.imagesPath, cordis.imagesPath, file.imagesPath) || DEFAULT_IMAGES_PATH,
    apiKey: firstNonEmpty(env('DSH_IMAGE_API_KEY'), settings.apiKey, cordis.apiKey, file.apiKey),
    outputDirectory,
    timeoutMs,
  }
}

const SIZE_OPTIONS = [...SIZES] as ImageSize[]
const QUALITY_OPTIONS = [...QUALITIES] as ImageQuality[]

interface ParsedCommandInput {
  prompt: string
  size?: ImageSize
  quality?: ImageQuality
  error?: string
}

function parseCommandInput(rawInput: string): ParsedCommandInput {
  const words: string[] = []
  let size: ImageSize | undefined
  let quality: ImageQuality | undefined
  for (const part of rawInput.trim().split(/\s+/)) {
    const sizeMatch = part.match(/^--size=(\S+)$/)
    const qualityMatch = part.match(/^--quality=(low|medium|high)$/)
    if (sizeMatch) size = sizeMatch[1] as ImageSize
    else if (qualityMatch) quality = qualityMatch[1] as ImageQuality
    else if (part === '--low') quality = 'low'
    else if (part === '--medium') quality = 'medium'
    else if (part === '--high') quality = 'high'
    else if (part) words.push(part)
  }
  const prompt = words.join(' ').trim()
  if (!prompt) {
    return {
      prompt: '',
      error:
        'Usage: /dsh-image-gen <prompt> [--size=1024x1024|1024x1536|1536x1024|auto] [--quality=low|medium|high]',
    }
  }
  if (size !== undefined && !SIZES.includes(size)) {
    return { prompt, error: 'Unsupported size: ' + size + ' (supported: ' + SIZES.join(', ') + ')' }
  }
  return { prompt, size, quality }
}

export function apply(ctx: Context, config: Config): void {
  const file = readLocalConfigFile()
  let resolved = resolveConfig(config, {}, file)
  // Live settings scope (web UI Plugins page); the local file remains the
  // bottom fallback on every re-resolution.
  let source = (): Partial<Config> => config
  installSettingsSection(
    ctx,
    settingsNamespace(SETTINGS_NS),
    Config,
    { ...config },
    {
      setSource: (current) => {
        source = current
      },
      onChange: () => {
        resolved = resolveConfig(config, source(), file)
      },
    },
  )
  ctx.logger?.info?.('[dsh-image-gen] model=' + resolved.model + ' baseUrl=' + (resolved.baseUrl ? 'configured' : 'NOT SET'))

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'dsh_image_gen_config',
    description:
      '本地检查图像生成配置（网关 baseUrl / API Key / 输出目录），不发网络请求、不产生账单。不确定配置是否健康时先调用。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        properties: {
          configured: { type: 'boolean' },
          model: { type: 'string' },
          baseUrl: { type: 'string' },
          endpoint: { type: 'string' },
          outputDirectory: { type: 'string' },
          credentialAvailable: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: [
          'Image generation is configured.',
          'Model: ' + value.model,
          'Base URL: ' + value.baseUrl,
          'Endpoint: ' + value.endpoint,
          'Output directory: ' + value.outputDirectory,
          'Credential: available (value not exposed)',
        ].join('\n'),
      }],
    },
    async execute() {
      try {
        return await checkConfiguration(resolved)
      } catch (error) {
        throw new Error(sanitizeError(error))
      }
    },
  })), 'dsh-image-gen: config tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'dsh_image_gen',
    description:
      '付费且非幂等：调用配置的 OpenAI 兼容生图网关生成一张图并保存到本地。单次上游请求，绝不自动重试。',
    parameters: {
      prompt: { type: 'string', required: true, description: '要生成图像的精确描述。' },
      size: { type: 'string', enum: SIZE_OPTIONS, description: '输出尺寸，缺省 ' + DEFAULT_SIZE + '。' },
      quality: { type: 'string', enum: QUALITY_OPTIONS, description: '生成质量 low/medium/high，缺省 ' + DEFAULT_QUALITY + '。' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          model: { type: 'string' },
          endpoint: { type: 'string' },
          size: { type: 'string' },
          quality: { type: 'string' },
          mimeType: { type: 'string' },
          bytes: { type: 'integer' },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: [
          'Generated one image.',
          'Path: ' + value.path,
          'Model: ' + value.model,
          'Size: ' + value.size,
          'Quality: ' + value.quality,
          'Format: ' + value.mimeType,
          'Bytes: ' + value.bytes,
        ].join('\n'),
      }],
    },
    timeoutMs: 330_000,
    isConcurrencySafe: () => false,
    async execute(args: { prompt: string; size?: ImageSize; quality?: ImageQuality }) {
      try {
        const result = await generateImage(
          { prompt: args.prompt, size: args.size ?? DEFAULT_SIZE, quality: args.quality ?? DEFAULT_QUALITY },
          resolved,
        )
        const endpoint = resolveEndpointText(resolved)
        return {
          path: result.path,
          model: resolved.model || DEFAULT_MODEL,
          endpoint,
          size: args.size ?? DEFAULT_SIZE,
          quality: args.quality ?? DEFAULT_QUALITY,
          mimeType: result.mimeType,
          bytes: result.bytes,
        }
      } catch (error) {
        throw new Error(sanitizeError(error))
      }
    },
  })), 'dsh-image-gen: generate tool')

  ctx.effect(() => ctx.commands.register({
    name: 'dsh-image-gen',
    description: 'Generate one image through the configured OpenAI-compatible image gateway (paid, no auto-retry)',
    input: { hint: '<prompt> [--size=1024x1024|1024x1536|1536x1024|auto] [--quality=low|medium|high]' },
    handler: async (invocation) => {
      const parsed = parseCommandInput(invocation.rawInput)
      if (parsed.error) return { kind: 'error', text: parsed.error }
      try {
        const result = await generateImage(
          { prompt: parsed.prompt, size: parsed.size, quality: parsed.quality },
          resolved,
          globalThis.fetch,
          invocation.signal,
        )
        return {
          kind: 'success',
          text: [
            'Generated one image.',
            'Path: ' + result.path,
            'Model: ' + (resolved.model || DEFAULT_MODEL),
            'Size: ' + (parsed.size ?? DEFAULT_SIZE),
            'Quality: ' + (parsed.quality ?? DEFAULT_QUALITY),
            'Format: ' + result.mimeType,
            'Bytes: ' + result.bytes,
          ].join('\n'),
        }
      } catch (error) {
        return { kind: 'error', text: sanitizeError(error) }
      }
    },
  } as CommandDefinition), 'dsh-image-gen: command')

  ctx.effect(() => ctx.skills.register({
    name: 'dsh-image-gen',
    source: 'runtime' as const,
    description:
      'Generate a raster image through the configured OpenAI-compatible image gateway when the user asks to create an image.',
    content: [
      '# Image Generation (dsh-image-gen)',
      '',
      'Generate images through the user-configured OpenAI-compatible image gateway.',
      '',
      '## Workflow',
      '',
      'Deterministic trigger: run the /dsh-image-gen <prompt> [--size=...] [--quality=...] command (generates directly, without a model turn).',
      '',
      '1. When configuration health is uncertain, call dsh_image_gen_config. This check is local and does not generate an image.',
      '2. Call dsh_image_gen once with a precise prompt and the requested size and quality.',
      '3. Treat generation as paid and non-idempotent. Do not retry automatically after a timeout or ambiguous network failure.',
      '4. Return the saved local path to the user (use vision_present to show it when available).',
      '',
      '## Configuration (first non-empty wins)',
      '',
      '- env: DSH_IMAGE_BASE_URL / DSH_IMAGE_MODEL / DSH_IMAGE_API_KEY / DSH_IMAGE_IMAGES_PATH / DSH_IMAGE_OUTPUT_DIR / DSH_IMAGE_TIMEOUT_MS',
      '- DSH settings UI: Plugins page card (live)',
      '- profile config row (cordis.patch.yml config block)',
      '- local file: ~/.dsh/dsh-image-gen.json (mode 0600)',
      '',
      'The gateway must speak the OpenAI Images API shape: POST {baseUrl}{imagesPath} with { model, prompt, n, size, quality } returning data[0].b64_json.',
      '',
      'Do not modify DSH main model providers to use this tool.',
    ].join('\n'),
  }), 'dsh-image-gen: skill')
}

function resolveEndpointText(config: DshImageGenConfig): string {
  const base = (config.baseUrl || '').trim().replace(/\/+$/, '')
  const rawPath = (config.imagesPath || DEFAULT_IMAGES_PATH).trim()
  const imagesPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath
  return base + imagesPath
}
