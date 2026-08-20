/**
 * Generic OpenAI-compatible image generation service.
 *
 * Contract: POST {baseUrl}{imagesPath} with { model, prompt, n: 1, size, quality }
 * and Bearer auth; the gateway answers { data: [{ b64_json }] }.
 * Works with any gateway/proxy that speaks the OpenAI Images API shape —
 * nothing gateway-specific is hardcoded.
 */
export declare const DEFAULT_MODEL = "gpt-image-2";
export declare const DEFAULT_IMAGES_PATH = "/images/generations";
export declare const DEFAULT_OUTPUT_DIRECTORY: string;
export declare const DEFAULT_SIZE = "1024x1024";
export declare const DEFAULT_QUALITY = "high";
export declare const DEFAULT_TIMEOUT_MS = 300000;
export declare const SIZES: readonly ["1024x1024", "1024x1536", "1536x1024", "auto"];
export type ImageSize = (typeof SIZES)[number];
export declare const QUALITIES: readonly ["low", "medium", "high"];
export type ImageQuality = (typeof QUALITIES)[number];
export interface DshImageGenConfig {
    baseUrl: string;
    model: string;
    imagesPath: string;
    apiKey?: string;
    outputDirectory: string;
    timeoutMs: number;
}
export interface ConfigurationSummary {
    configured: boolean;
    model: string;
    baseUrl: string;
    endpoint: string;
    outputDirectory: string;
    credentialAvailable: boolean;
}
export interface GeneratedImage {
    path: string;
    mimeType: string;
    bytes: number;
    base64: string;
}
export declare function resolveEndpoint(config: DshImageGenConfig): string;
export declare function readApiKey(config: DshImageGenConfig): string;
export declare function checkConfiguration(config: DshImageGenConfig): Promise<ConfigurationSummary>;
export declare function detectImageType(buffer: Buffer): {
    extension: string;
    mimeType: string;
};
export interface GenerateImageArgs {
    prompt: string;
    size?: ImageSize;
    quality?: ImageQuality;
}
export declare function generateImage(args: GenerateImageArgs, config: DshImageGenConfig, fetchImpl?: typeof fetch, externalSignal?: AbortSignal): Promise<GeneratedImage>;
export declare function sanitizeError(error: unknown): string;
