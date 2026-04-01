/**
 * Mermaid 图表处理器
 * 使用 @mermaid-js/mermaid-cli (mmdc) 将 mermaid 代码渲染为 PNG 图片
 *
 * 流程: mermaid code → mmdc → PNG 临时文件 → <img src="path"> → CLI 上传到微信 CDN
 *
 * mmdc 为可选依赖，未安装时优雅降级（保留代码块原样）
 * 安装方式: npm install -g @mermaid-js/mermaid-cli
 */
import type * as cheerio from 'cheerio';
/**
 * 使用 mmdc 将 mermaid 代码渲染为 PNG 文件
 * @returns PNG 文件路径，失败或 mmdc 不可用时返回 null
 */
export declare function renderMermaidToPng(code: string): string | null;
/**
 * 处理 HTML 中的 mermaid 代码块
 * 将 ```mermaid 代码块渲染为 PNG 图片
 * 图片路径会被 converter 的 processImages 收集，CLI publish 时上传到微信 CDN
 */
export declare function processMermaidBlocks($: cheerio.CheerioAPI): void;
/**
 * 检查 mermaid CLI 是否可用
 */
export declare function isMermaidAvailable(): boolean;
