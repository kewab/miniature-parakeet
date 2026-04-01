/**
 * AI image generation — multi-provider + Nano Banana Pro library search + CDN fallback covers.
 *
 * Providers: youmind | gemini | openai | doubao
 * Fallback chain: API → Nano Banana Pro library match → Pollinations fallback → CDN predefined covers → prompt-only output
 *
 * Usage:
 *   npx tsx src/image-gen.ts --prompt "..." --output cover.jpg --size cover
 *   npx tsx src/image-gen.ts --prompt "..." --output img.jpg --provider gemini
 *   npx tsx src/image-gen.ts --search "tech futuristic" --output img.jpg
 *   npx tsx src/image-gen.ts --fallback-cover --color "#3498db" --output cover.jpg
 */
declare const SIZE_MAP: Record<string, Record<string, string>>;
interface ProviderConfig {
    api_key?: string;
    model?: string;
    base_url?: string;
}
interface ImageConfig {
    default_provider?: string;
    providers?: Record<string, ProviderConfig>;
}
declare function resolveProvider(config: {
    image: ImageConfig;
    youmind?: {
        api_key?: string;
    };
}, explicit?: string): [string, ProviderConfig];
declare function generateGemini(prompt: string, apiKey: string, aspectRatio: string, model?: string): Promise<Buffer>;
declare function generateOpenAI(prompt: string, apiKey: string, size: string, model?: string, baseUrl?: string): Promise<Buffer>;
declare function generateDoubao(prompt: string, apiKey: string, size: string, model?: string, baseUrl?: string, imageInput?: string): Promise<Buffer>;
type GenerateFn = (prompt: string, apiKey: string, sizeOrRatio: string, model?: string, baseUrl?: string) => Promise<Buffer>;
declare function generatePollinations(prompt: string, outputPath: string, size?: 'cover' | 'article'): Promise<boolean>;
declare const GENERATORS: Record<string, GenerateFn>;
interface NanaBananaPrompt {
    id?: string;
    title?: string;
    content?: string;
    description?: string;
    sourceMedia?: string[];
}
declare function searchNanoBanana(keywords: string, maxResults?: number): NanaBananaPrompt[];
declare function selectFallbackCover(color?: string, mood?: string): string | null;
declare function downloadFallbackCover(url: string, output: string): Promise<boolean>;
export { generateGemini, generateOpenAI, generateDoubao, generatePollinations, searchNanoBanana, selectFallbackCover, downloadFallbackCover, resolveProvider, GENERATORS, SIZE_MAP, };
export { COVER_PALETTE, COLOR_HUE_MAP } from './cover-assets.js';
