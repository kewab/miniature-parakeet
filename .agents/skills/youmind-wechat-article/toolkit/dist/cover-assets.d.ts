/**
 * Remote cover image assets hosted on marketing-assets.youmind.com.
 */
export interface CoverMeta {
    url: string;
    hue: string;
    tone: string;
    mood: string;
}
export declare const COVER_PALETTE: Record<string, CoverMeta>;
export declare const COLOR_HUE_MAP: Record<string, string>;
