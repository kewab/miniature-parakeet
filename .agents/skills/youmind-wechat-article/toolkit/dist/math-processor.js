/**
 * 数学公式处理器
 * 使用 MathJax 将 LaTeX 公式转换为 SVG，适配微信公众号
 *
 * 移植自 YouMind 编辑器的 mathProcessor.ts
 */
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
// 初始化 MathJax（单例，惰性创建）
let adaptor;
let mathjaxDocument;
function ensureInit() {
    if (mathjaxDocument)
        return;
    adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX({ packages: AllPackages });
    const svg = new SVG({ fontCache: 'none' });
    mathjaxDocument = mathjax.document('', { InputJax: tex, OutputJax: svg });
}
/**
 * 将 LaTeX 公式转换为 SVG 字符串
 */
export function latexToSvg(latex, isBlock = false) {
    ensureInit();
    const node = mathjaxDocument.convert(latex, { display: isBlock });
    let svgString = adaptor.innerHTML(node);
    svgString = svgString.replace(/<svg /, '<svg style="vertical-align: middle;" ');
    return svgString;
}
/**
 * 将 LaTeX 公式转换为微信公众号兼容的 HTML
 */
export function convertMathToHtml(latex, isBlock = false) {
    const svgContent = latexToSvg(latex, isBlock);
    const escapedLatex = latex.replace(/"/g, '&quot;');
    if (isBlock) {
        return `<p style="text-align: center; margin: 16px 0;"><span data-formula="${escapedLatex}">${svgContent}</span></p>`;
    }
    return `<span data-formula="${escapedLatex}">${svgContent}</span>`;
}
/**
 * 处理 HTML 中的数学公式
 * 将 $...$ (行内) 和 $$...$$ (块级) 转换为 SVG
 * 自动跳过 <code> 和 <pre> 标签内的内容
 */
export function processMathInHtml(html) {
    // 保护 pre 和 code 块，避免处理其中的公式符号
    const protectedBlocks = [];
    let result = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
        protectedBlocks.push(match);
        return `\x00MATH_PROTECTED_${protectedBlocks.length - 1}\x00`;
    });
    result = result.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, (match) => {
        protectedBlocks.push(match);
        return `\x00MATH_PROTECTED_${protectedBlocks.length - 1}\x00`;
    });
    // 处理块级公式 $$...$$
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
        try {
            return convertMathToHtml(latex.trim(), true);
        }
        catch (error) {
            console.error('Failed to convert block math:', latex, error);
            return `<code style="color: #e74c3c; background: #fdf2f2; padding: 2px 4px; border-radius: 3px;">$$${latex}$$</code>`;
        }
    });
    // 处理行内公式 $...$（排除 $$ 和价格类 $100）
    result = result.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, latex) => {
        try {
            return convertMathToHtml(latex.trim(), false);
        }
        catch (error) {
            console.error('Failed to convert inline math:', latex, error);
            return `<code style="color: #e74c3c; background: #fdf2f2; padding: 2px 4px; border-radius: 3px;">$${latex}$</code>`;
        }
    });
    // 恢复被保护的块
    result = result.replace(/\x00MATH_PROTECTED_(\d+)\x00/g, (_, i) => protectedBlocks[parseInt(i)]);
    return result;
}
