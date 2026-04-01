/**
 * 代码块增强处理器
 * 将 pre>code 代码块转换为 macOS 窗口风格，带语法高亮内联样式
 *
 * 功能:
 * - macOS 风格顶部栏（红黄绿三个圆点）
 * - highlight.js class 转换为内联 style（微信不支持 CSS class）
 * - 空格/Tab 保留（微信会压缩空白字符）
 * - 每行独立包裹，支持横向滚动
 *
 * 移植自 YouMind 编辑器的 renderer.ts
 */
import type * as cheerio from 'cheerio';
/**
 * 增强代码块：macOS 风格 + 语法高亮内联样式
 * 替换 converter.ts 中原有的 enhanceCodeBlocks + 代码块样式
 */
export declare function enhanceCodeBlocks($: cheerio.CheerioAPI): void;
