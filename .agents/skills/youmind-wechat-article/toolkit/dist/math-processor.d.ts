/**
 * 数学公式处理器
 * 使用 MathJax 将 LaTeX 公式转换为 SVG，适配微信公众号
 *
 * 移植自 YouMind 编辑器的 mathProcessor.ts
 */
/**
 * 将 LaTeX 公式转换为 SVG 字符串
 */
export declare function latexToSvg(latex: string, isBlock?: boolean): string;
/**
 * 将 LaTeX 公式转换为微信公众号兼容的 HTML
 */
export declare function convertMathToHtml(latex: string, isBlock?: boolean): string;
/**
 * 处理 HTML 中的数学公式
 * 将 $...$ (行内) 和 $$...$$ (块级) 转换为 SVG
 * 自动跳过 <code> 和 <pre> 标签内的内容
 */
export declare function processMathInHtml(html: string): string;
