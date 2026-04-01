/**
 * YouMind Dynamic Theme Engine for WeChat
 *
 * Ported from YouMind's styles.ts — generates WeChat-compatible inline CSS
 * dynamically based on theme key + color. No YAML theme files needed.
 *
 * 4 themes: simple | center | decoration | prominent
 * 8 preset colors + custom HEX color support
 */
export declare const PRESET_COLORS: Record<string, string>;
export declare const PRESET_COLOR_LIST: string[];
export declare const DEFAULT_COLOR = "#3498db";
export declare const DEFAULT_THEME = "simple";
export type ThemeKey = 'simple' | 'center' | 'decoration' | 'prominent';
export type HeadingSize = 'minus2' | 'minus1' | 'standard' | 'plus1';
export type ParagraphSpacing = 'compact' | 'normal' | 'loose';
export type FontFamily = 'default' | 'optima' | 'serif';
export interface ThemeStyles {
    container: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    p: string;
    strong: string;
    em: string;
    strike: string;
    u: string;
    a: string;
    ul: string;
    ol: string;
    li: string;
    liText: string;
    taskList: string;
    taskListItem: string;
    taskListItemCheckbox: string;
    blockquote: string;
    code: string;
    pre: string;
    hr: string;
    img: string;
    tableWrapper: string;
    table: string;
    th: string;
    td: string;
    tr: string;
    codeBlockPre: string;
    codeBlockCode: string;
}
export interface Theme {
    name: string;
    key: ThemeKey;
    description: string;
    color: string;
    styles: ThemeStyles;
}
export interface ThemeOptions {
    themeKey?: ThemeKey;
    color?: string;
    fontFamily?: FontFamily;
    fontSize?: number;
    headingSize?: HeadingSize;
    paragraphSpacing?: ParagraphSpacing;
}
export declare class ColorPalette {
    private mainColor;
    private luminance;
    constructor(color: string);
    private static hexToRgb;
    private static rgbToHex;
    private static calcLuminance;
    private adjustBrightness;
    private mix;
    get primary(): string;
    get primaryDark(): string;
    get primaryLight(): string;
    get primaryLightest(): string;
    get background(): string;
    rgba(alpha: number): string;
    get isDark(): boolean;
}
export declare function generateTheme(options?: ThemeOptions): Theme;
export declare function listThemes(): Array<{
    key: ThemeKey;
    name: string;
    description: string;
}>;
export declare function listPresetColors(): Record<string, string>;
