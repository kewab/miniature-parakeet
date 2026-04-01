/**
 * Markdown to WeChat-compatible HTML converter.
 *
 * Uses YouMind's dynamic theme engine + cheerio for robust HTML manipulation.
 * Much better HTML processing than Python's BeautifulSoup.
 */
import { type Theme, type ThemeOptions } from './theme-engine.js';
export interface ConvertResult {
    html: string;
    title: string;
    digest: string;
    images: string[];
}
export interface ConverterOptions extends ThemeOptions {
    /** 是否显示 YouMind logo 水印 */
    showLogo?: boolean;
    /** 直接传入自定义主题对象，跳过 generateTheme */
    customTheme?: Theme;
}
export declare class WeChatConverter {
    private theme;
    private md;
    private showLogo;
    constructor(options?: ConverterOptions);
    getTheme(): Theme;
    convert(markdownText: string): ConvertResult;
    convertFile(inputPath: string): ConvertResult;
    private extractTitle;
    /**
     * Fix CJK emphasis: markdown-it's flanking delimiter algorithm fails when
     * closing emphasis (e.g. **) is preceded by CJK punctuation and followed
     * by a CJK character — e.g. **第一，去体检。**不是 won't bold.
     *
     * Inserts a hair space (U+200A, recognized as whitespace by markdown-it)
     * after the closing marker so it passes the right-flanking test.
     * The hair space is stripped from rendered HTML after markdown-it runs.
     */
    private fixCjkEmphasis;
    private stripH1;
    private processImages;
    /**
     * 将任务列表的 <input> checkbox 转换为样式化的 <span>
     * 微信公众号不支持 <input> 元素
     */
    private convertTaskListCheckboxes;
    private applyInlineStyles;
    private applyWeChatFixes;
    private addLogo;
    private generateDigest;
}
/**
 * 生成完整 HTML 用于浏览器预览（仅本地预览，非微信发布用）
 */
export declare function previewHtml(bodyHtml: string, theme: Theme): string;
