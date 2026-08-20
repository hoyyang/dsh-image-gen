import { constants as fsConstants } from 'node:fs'
import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Generic OpenAI-compatible image generation service.
 *
 * Contract: POST {baseUrl}{imagesPath} with { model, prompt, n: 1, size, quality }
 * and Bearer auth; the gateway answers { data: [{ b64_json }] }.
 * Works with any gateway/proxy that speaks the OpenAI Images API shape —
 * nothing gateway-specific is hardcoded.
 */

export const DEFAULT_MODEL = 'gpt-image-2'
export const DEFAULT_IMAGES_PATH = '/images/generations'
export const DEFAULT_OUTPUT_DIRECTORY = path.join(homedir(), '.dsh', 'generated_images', 'dsh-image-gen')
export const DEFAULT_SIZE = '1024x1024'
export const DEFAULT_QUALITY = 'high'
export const DEFAULT_TIMEOUT_MS = 300_000

export const SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'] as const
export type ImageSize = (typeof SIZES)[number]
export const QUALITIES = ['low', 'medium', 'high'] as const
export type ImageQuality = (typeof QUALITIES)[number]

export interface DshImageGenConfig {
  baseUrl: string
  model: string
  imagesPath: string
  apiKey?: string
  outputDirectory: string
  timeoutMs: number
}

const REQUEST_TIMEOUT_FLOOR_MS = 1_000
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024
const MAX_ERROR_BYTES = 64 * 1024
const MAX_IMAGE_BYTES = 40 * 1024 * 1024

export interface ConfigurationSummary {
  configured: boolean
  model: string
  baseUrl: string
  endpoint: string
  outputDirectory: string
  credentialAvailable: boolean
}

export interface GeneratedImage {
  path: string
  mimeType: string
  bytes: number
  base64: string
}

export function resolveEndpoint(config: DshImageGenConfig): string {
  const base = (config.baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) {
    throw new Error(
      'No gateway base URL configured. Set it in DSH settings (Plugins page), in the profile config row, in ~/.dsh/dsh-image-gen.json, or via DSH_IMAGE_BASE_URL.',
    )
  }
  if (!base.startsWith('https://')) {
    throw new Error('The gateway base URL must use https.')
  }
  const rawPath = (config.imagesPath || DEFAULT_IMAGES_PATH).trim()
  const imagesPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath
  return base + imagesPath
}

export function readApiKey(config: DshImageGenConfig): string {
  const apiKey = (config.apiKey || '').trim()
  if (apiKey.length < 8) {
    throw new Error(
      'API key missing. Set it in DSH settings (Plugins page), in the profile config row, in ~/.dsh/dsh-image-gen.json, or via DSH_IMAGE_API_KEY.',
    )
  }
  return apiKey
}

async function ensurePrivateOutputDirectory(outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 })
  const stat = await lstat(outputDirectory)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('The image output path is not a regular directory.')
  }
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    throw new Error('The image output directory is not owned by the current user.')
  }
  await chmod(outputDirectory, 0o700)
}

export async function checkConfiguration(config: DshImageGenConfig): Promise<ConfigurationSummary> {
  const endpoint = resolveEndpoint(config)
  readApiKey(config)
  await ensurePrivateOutputDirectory(config.outputDirectory)
  return {
    configured: true,
    model: config.model || DEFAULT_MODEL,
    baseUrl: config.baseUrl.trim().replace(/\/+$/, ''),
    endpoint,
    outputDirectory: path.resolve(config.outputDirectory),
    credentialAvailable: true,
  }
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    throw new Error('The image service returned an empty response.')
  }
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error('The image service response exceeded the configured size limit.')
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

function parseJson(bytes: Buffer, label: string): any {
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('The image service returned invalid ' + label + ' JSON.')
  }
}

function extractUpstreamError(payload: any, status: number, apiKey: string): Error {
  const rawMessage =
    payload?.error?.message ?? payload?.message ?? 'The image service returned HTTP ' + status + '.'
  const message = String(rawMessage).split(apiKey).join('[REDACTED]')
  const rawCode = payload?.error?.code ?? payload?.code
  const code = rawCode == null ? '' : ', code ' + String(rawCode)
  return new Error('Image generation failed (HTTP ' + status + code + '): ' + message)
}

function normalizeBase64(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('The image service did not return base64 image data.')
  }
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/s)
  const raw = match ? match[2]! : value
  if (raw.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) {
    throw new Error('The generated image exceeded the configured size limit.')
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 === 1) {
    throw new Error('The image service returned malformed base64 data.')
  }
  const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=')
  const buffer = Buffer.from(padded, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('The generated image size is invalid.')
  }
  if (buffer.toString('base64') !== padded) {
    throw new Error('The image service returned non-canonical base64 data.')
  }
  return buffer
}

export function detectImageType(buffer: Buffer): { extension: string; mimeType: string } {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: 'png', mimeType: 'image/png' }
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' }
  }
  throw new Error('The image service returned an unsupported or invalid image file.')
}

async function writeImageAtomically(
  outputDirectory: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  await ensurePrivateOutputDirectory(outputDirectory)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const id = randomUUID()
  const finalPath = path.join(outputDirectory, stamp + '-' + id + '.' + extension)
  const temporaryPath = path.join(outputDirectory, '.' + id + '.tmp')
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600)
    await handle.writeFile(buffer)
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryPath, finalPath)
    await chmod(finalPath, 0o600)
    return finalPath
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    await rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }
}

export interface GenerateImageArgs {
  prompt: string
  size?: ImageSize
  quality?: ImageQuality
}

export async function generateImage(
  args: GenerateImageArgs,
  config: DshImageGenConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
  externalSignal?: AbortSignal,
): Promise<GeneratedImage> {
  if (typeof fetchImpl !== 'function') {
    throw new Error('No HTTP client is available for image generation.')
  }
  const normalizedPrompt = typeof args.prompt === 'string' ? args.prompt.trim() : ''
  if (normalizedPrompt.length === 0 || normalizedPrompt.length > 32000) {
    throw new Error('The image prompt must contain between 1 and 32000 characters.')
  }
  const size = args.size ?? DEFAULT_SIZE
  const quality = args.quality ?? DEFAULT_QUALITY
  if (!SIZES.includes(size)) {
    throw new Error('The requested image size is not supported.')
  }
  if (!QUALITIES.includes(quality)) {
    throw new Error('The requested image quality is not supported.')
  }
  const endpoint = resolveEndpoint(config)
  const apiKey = readApiKey(config)
  if (externalSignal?.aborted) {
    throw new Error('Image generation was cancelled.')
  }
  const timeoutMs = Math.max(REQUEST_TIMEOUT_FLOOR_MS, config.timeoutMs | 0)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  timeout.unref?.()
  const forwardAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', forwardAbort, { once: true })
  let response: Response
  let responseBytes: Buffer
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODEL,
        prompt: normalizedPrompt,
        n: 1,
        size,
        quality,
      }),
      redirect: 'error',
      signal: controller.signal,
    })
    responseBytes = await readBodyWithLimit(response, response.ok ? MAX_RESPONSE_BYTES : MAX_ERROR_BYTES)
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      if (externalSignal?.aborted) {
        throw new Error('Image generation was cancelled.')
      }
      throw new Error('Image generation timed out after ' + Math.ceil(timeoutMs / 1000) + ' seconds.')
    }
    if (error instanceof Error && error.message.startsWith('The image service response')) {
      throw error
    }
    throw new Error('The image service request could not be completed.')
  } finally {
    clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', forwardAbort)
  }
  const payload = parseJson(responseBytes, response.ok ? 'response' : 'error')
  if (!response.ok) {
    throw extractUpstreamError(payload, response.status, apiKey)
  }
  const imageBuffer = normalizeBase64(payload?.data?.[0]?.b64_json)
  const { extension, mimeType } = detectImageType(imageBuffer)
  const outputPath = await writeImageAtomically(config.outputDirectory, imageBuffer, extension)
  return {
    path: outputPath,
    mimeType,
    bytes: imageBuffer.length,
    base64: imageBuffer.toString('base64'),
  }
}

export function sanitizeError(error: unknown): string {
  let message = error instanceof Error ? error.message : 'Image generation failed.'
  message = message
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/(["']?(?:api[_-]?key|authorization)["']?\s*[:=]\s*)[^\s,;}]+/gi, '$1[REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 600)
  return message || 'Image generation failed.'
}
