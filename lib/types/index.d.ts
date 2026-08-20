import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "@dsh-external/dsh-image-gen";
export declare const inject: string[];
export interface Config {
    baseUrl: string;
    model: string;
    imagesPath: string;
    apiKey: string;
    outputDirectory: string;
    timeoutMs: number;
}
export declare const Config: z<Schemastery.ObjectS<{
    baseUrl: z<string, string>;
    model: z<string, string>;
    imagesPath: z<string, string>;
    apiKey: z<string, string>;
    outputDirectory: z<string, string>;
    timeoutMs: z<number, number>;
}>, Schemastery.ObjectT<{
    baseUrl: z<string, string>;
    model: z<string, string>;
    imagesPath: z<string, string>;
    apiKey: z<string, string>;
    outputDirectory: z<string, string>;
    timeoutMs: z<number, number>;
}>>;
/** Settings namespace persisted by the DSH settings store (editable in the web UI Plugins page). */
export declare const SETTINGS_NS = "dsh-image-gen";
export declare function apply(ctx: Context, config: Config): void;
