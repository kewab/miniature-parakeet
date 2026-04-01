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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { COVER_PALETTE, COLOR_HUE_MAP, type CoverMeta } from './cover-assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = resolve(__dirname, '../..');
const NANO_BANANA_REFS = resolve(
  PROJECT_DIR, 'toolkit', '.claude', 'skills',
  'nano-banana-pro-prompts-recommend-skill', 'references',
);

// ---------------------------------------------------------------------------
// Size mapping
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<string, Record<string, string>> = {
  cover: {
    youmind: '1536x1024', gemini: '16:9', openai: '1536x1024', doubao: '1280x544',
  },
  article: {
    youmind: '1536x1024', gemini: '16:9', openai: '1536x1024', doubao: '1280x720',
  },
};

// COVER_PALETTE and COLOR_HUE_MAP imported from cover-assets.ts

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  api_key?: string;
  model?: string;
  base_url?: string;
}

interface ImageConfig {
  default_provider?: string;
  providers?: Record<string, ProviderConfig>;
}

interface PromptModules {
  scene: string;
  style: string;
  outfit: string;
  light: string;
  pose: string;
  element: string;
  quality: [string, string];
  theme?: string;
}

const SCENES = [
  '现代极简摄影棚，纯色背景',
  '高级公寓落地窗前，城市夜景',
  '日系木质房间，阳光透窗',
  '咖啡馆靠窗座位，下午光影',
  '海边沙滩，蓝天白云',
  '城市街头夜景，霓虹灯',
  '屋顶天台，远景城市',
  '法式复古卧室',
  'ins风白墙+绿植',
  '书店安静角落',
  '雨天玻璃窗前',
  '森林草地，逆光',
  '大学教室/舞蹈室（类似原图但更高级）',
  '酒店高级套房',
  '泳池边度假风',
  '艺术展厅空间',
  '地铁站冷色调',
  '日落公路',
  '雪景户外',
  '樱花树下',
];

const STYLES = [
  '日系清新写真风',
  'ins网红风',
  '高级时尚杂志风',
  '电影感光影',
  '韩系氛围感',
  '复古胶片风',
  '冷淡风极简',
  '少女感写真',
  '轻奢风',
  '欧美街拍风',
  '梦幻柔光风',
  '写实摄影风',
  '艺术感构图',
  'VLOG截图风',
  '朦胧氛围感',
];

const OUTFITS = [
  '白色连衣裙',
  '黑色紧身裙',
  'JK制服',
  '针织衫+短裙',
  '吊带长裙',
  '衬衫+百褶裙',
  '西装外套+短裙',
  '露肩上衣',
  '运动瑜伽套装',
  '牛仔短裙+T恤',
  '轻奢晚礼服',
  '毛衣+丝袜',
  '风衣穿搭',
  '泳装（偏度假风）',
  '学院风穿搭',
];

const LIGHTS = [
  '自然柔光',
  '逆光氛围',
  '强对比光影',
  '冷色调灯光',
  '暖色夕阳光',
  '窗边侧光',
  '霓虹灯光',
  '顶光高级感',
  '电影打光',
  '漫反射柔光',
];

const QUALITY = [
  '8K细节',
  '超高清',
  '真实摄影质感',
  '皮肤细腻',
  '细节清晰',
  '专业摄影',
  '高动态范围',
  '电影级画质',
];

const PURE_POSES = [
  '手捧马克杯或书本，身体微微前倾，温柔看向镜头',
  '慵懒坐姿或跪坐姿，放松自然',
  '轻撩发丝或托腮，表情清澈',
  '侧身端坐，双腿并拢，双手自然放置',
  '倚墙侧立，一条腿自然弯曲，脚尖轻点',
  '桌边坐姿并轻撩头发，知性且克制',
  '桌面前倾姿态，注意优雅与尺度，避免低俗化',
  '跪姿挺身并手部轻互动，保持高级感',
];

const KEY_ELEMENTS = [
  '碎花与荷叶边细节',
  '蕾丝与轻纱层次',
  '半透明材质点缀（锁骨/肩部）',
];

const THEME_PACKS: Record<string, {
  scenes: string[];
  styles: string[];
  outfits: string[];
  lights: string[];
  poses?: string[];
  elements?: string[];
}> = {
  '纯欲': {
    scenes: ['法式复古卧室', '日系木质房间，阳光透窗', '高级公寓落地窗前，城市夜景'],
    styles: ['韩系氛围感', '少女感写真', '梦幻柔光风'],
    outfits: ['吊带长裙', '露肩上衣', '毛衣+丝袜'],
    lights: ['自然柔光', '窗边侧光', '漫反射柔光'],
    poses: PURE_POSES,
    elements: KEY_ELEMENTS,
  },
  '御姐': {
    scenes: ['城市街头夜景，霓虹灯', '酒店高级套房', '艺术展厅空间'],
    styles: ['高级时尚杂志风', '冷淡风极简', '欧美街拍风'],
    outfits: ['西装外套+短裙', '黑色紧身裙', '风衣穿搭'],
    lights: ['冷色调灯光', '强对比光影', '顶光高级感'],
  },
  '校园': {
    scenes: ['大学教室/舞蹈室（类似原图但更高级）', '书店安静角落', '日系木质房间，阳光透窗'],
    styles: ['日系清新写真风', '少女感写真', 'VLOG截图风'],
    outfits: ['JK制服', '衬衫+百褶裙', '学院风穿搭'],
    lights: ['自然柔光', '窗边侧光', '漫反射柔光'],
  },
  '度假': {
    scenes: ['海边沙滩，蓝天白云', '泳池边度假风', '日落公路'],
    styles: ['轻奢风', 'ins网红风', '写实摄影风'],
    outfits: ['泳装（偏度假风）', '白色连衣裙', '吊带长裙'],
    lights: ['暖色夕阳光', '自然柔光', '逆光氛围'],
  },
};

interface ImageHistoryRecord {
  date: string;
  file: string;
  source: string;
  signature: string;
  articleId?: string;
  prompt?: string;
  modules?: PromptModules;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoDistinct(arr: string[]): [string, string] {
  const first = randomPick(arr);
  const remain = arr.filter(v => v !== first);
  const second = remain.length ? randomPick(remain) : first;
  return [first, second];
}

function normalizeTheme(theme?: string): string | undefined {
  if (!theme) return undefined;
  const t = theme.trim();
  if (!t) return undefined;
  if (THEME_PACKS[t]) return t;
  const aliasMap: Record<string, string> = {
    pure: '纯欲',
    yujie: '御姐',
    campus: '校园',
    vacation: '度假',
  };
  return aliasMap[t.toLowerCase()] ?? t;
}

function buildPromptModules(opts: {
  theme?: string;
  scene?: string;
  style?: string;
  outfit?: string;
  light?: string;
  pose?: string;
  element?: string;
  forbiddenPoses?: string[];
}): PromptModules {
  const theme = normalizeTheme(opts.theme);
  const pack = theme ? THEME_PACKS[theme] : undefined;

  const scene = opts.scene || randomPick(pack?.scenes ?? SCENES);
  const style = opts.style || randomPick(pack?.styles ?? STYLES);
  const outfit = opts.outfit || randomPick(pack?.outfits ?? OUTFITS);
  const light = opts.light || randomPick(pack?.lights ?? LIGHTS);
  const posePool = (pack?.poses ?? PURE_POSES).filter(p => !(opts.forbiddenPoses ?? []).includes(p));
  const pose = opts.pose || randomPick(posePool.length ? posePool : (pack?.poses ?? PURE_POSES));
  const element = opts.element || randomPick(pack?.elements ?? KEY_ELEMENTS);
  const quality = pickTwoDistinct(QUALITY);

  return { scene, style, outfit, light, pose, element, quality, theme };
}

function buildConsistentPrompt(modules: PromptModules, extraPrompt?: string): string {
  const fixedConstraintZh = [
    '保持人物主体完全一致：身材比例不变，体型不变，姿势不变，',
    '头发长度不变（长发），发色保持黑色，',
    '脸部遮挡涂鸦样式完全保留（粉色卡通遮挡，不可修改或去除）。',
  ].join('\n');

  const fixedConstraintEn = [
    'highly consistent identity, same person,',
    'do not change body shape, do not change hair, preserve face mask,',
    'keep the pink cartoon face doodle mask unchanged and fully preserved.',
  ].join('\n');

  return [
    fixedConstraintZh,
    '',
    `场景：${modules.scene}`,
    `风格：${modules.style}`,
    `服装：${modules.outfit}`,
    `光影：${modules.light}`,
    `姿势：${modules.pose}`,
    `关键元素：${modules.element}`,
    '',
    `${modules.quality[0]}，${modules.quality[1]}。`,
    '真实人像摄影，构图自然，避免夸张变形。',
    '与参考图保持同一人物身份，但不要完全复刻原图构图与姿势。',
    '',
    fixedConstraintEn,
    'same identity but not an exact copy of the reference composition.',
    extraPrompt ? `\n额外要求：${extraPrompt}` : '',
  ].join('\n').trim();
}

function modulesSignature(m: PromptModules): string {
  return [m.theme ?? '', m.scene, m.style, m.outfit, m.light, m.pose, m.element].join('|');
}

function parseDateSafe(v?: string): number {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function deriveArticleIdFromOutput(outputPath: string): string {
  const base = basename(outputPath).replace(/\.[^.]+$/, '');
  return base.replace(/-\d+$/, '');
}

function readImageHistory(historyFile: string): ImageHistoryRecord[] {
  try {
    if (!existsSync(historyFile)) return [];
    const raw = JSON.parse(readFileSync(historyFile, 'utf-8'));
    if (Array.isArray(raw)) return raw as ImageHistoryRecord[];
    return [];
  } catch {
    return [];
  }
}

function writeImageHistory(historyFile: string, records: ImageHistoryRecord[]) {
  mkdirSync(dirname(historyFile), { recursive: true });
  writeFileSync(historyFile, JSON.stringify(records.slice(-500), null, 2), 'utf-8');
}

function pickNonRecentModules(
  opts: {
    theme?: string; scene?: string; style?: string; outfit?: string; light?: string; pose?: string; element?: string;
    forbiddenPoses?: string[];
  },
  history: ImageHistoryRecord[],
  now = Date.now(),
): PromptModules {
  const monthMs = 30 * 24 * 3600 * 1000;
  const recent = history
    .filter(r => now - parseDateSafe(r.date) <= monthMs)
    .map(r => r.signature);
  const recentSet = new Set(recent);

  for (let i = 0; i < 30; i++) {
    const candidate = buildPromptModules(opts);
    const sig = modulesSignature(candidate);
    if (!recentSet.has(sig)) return candidate;
  }
  return buildPromptModules(opts);
}

function deriveClientRootFromOutput(outputPath: string): string | null {
  const norm = resolve(outputPath).replace(/\\/g, '/');
  const marker = '/clients/';
  const idx = norm.indexOf(marker);
  if (idx < 0) return null;
  const rest = norm.slice(idx + marker.length);
  const client = rest.split('/')[0];
  if (!client) return null;
  return norm.slice(0, idx + marker.length + client.length);
}

function defaultHistoryFile(outputPath: string): string {
  const clientRoot = deriveClientRootFromOutput(outputPath);
  if (clientRoot) return `${clientRoot}/history_images.json`;
  return resolve(dirname(outputPath), 'history_images.json');
}

function chooseStockImageIfOldSimilar(
  history: ImageHistoryRecord[],
  signature: string,
  stockDir: string,
  now = Date.now(),
): string | null {
  const monthMs = 30 * 24 * 3600 * 1000;
  const oldSimilar = history.some(r => r.signature === signature && now - parseDateSafe(r.date) > monthMs);
  if (!oldSimilar) return null;
  if (!existsSync(stockDir)) return null;
  const indexFile = resolve(stockDir, '_index.txt');
  if (!existsSync(indexFile)) return null;
  const files = readFileSync(indexFile, 'utf-8')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => resolve(stockDir, s))
    .filter(p => existsSync(p));
  if (!files.length) return null;
  return randomPick(files);
}

function fileSha256(path: string): string {
  const buf = readFileSync(path);
  return createHash('sha256').update(buf).digest('hex');
}

function loadConfig(): { image: ImageConfig; youmind?: { api_key?: string } } {
  for (const name of ['config.yaml', 'config.example.yaml']) {
    const p = resolve(PROJECT_DIR, name);
    if (existsSync(p)) {
      const raw = parseYaml(readFileSync(p, 'utf-8')) ?? {};
      return { image: raw.image ?? {}, youmind: raw.youmind };
    }
  }
  return { image: {} };
}

function resolveProvider(
  config: { image: ImageConfig; youmind?: { api_key?: string } },
  explicit?: string,
): [string, ProviderConfig] {
  const img = config.image;
  const providers = img.providers ?? {};

  // youmind provider 可从顶层 youmind.api_key 继承
  if (providers.youmind && !providers.youmind.api_key && config.youmind?.api_key) {
    providers.youmind.api_key = config.youmind.api_key;
  }

  if (explicit) {
    const p = providers[explicit];
    if (p?.api_key) return [explicit, p];
    console.error(`[WARN] 指定的 provider '${explicit}' 未配置 api_key`);
    return [explicit, p ?? {}];
  }

  const defaultP = img.default_provider;
  if (defaultP && providers[defaultP]?.api_key) return [defaultP, providers[defaultP]];

  for (const [name, cfg] of Object.entries(providers)) {
    if (cfg.api_key) {
      console.error(`[INFO] 自动选择 provider: ${name}`);
      return [name, cfg];
    }
  }

  return ['', {}];
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function httpRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  timeoutMs = 120_000,
): Promise<Response> {
  for (let i = 1; i <= retries; i++) {
    try {
      const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 300))}`);
      return resp;
    } catch (e) {
      if (i === retries) throw e;
      const wait = 2 ** (i - 1) * 1000;
      console.error(`[WARN] 请求失败 (${i}/${retries}): ${e} — ${wait / 1000}s 后重试`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('unreachable');
}

function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  // GIF87a / GIF89a
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 &&
    buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return 'image/gif';
  return null;
}

function isValidImageBuffer(buf: Buffer, minBytes = 1024): boolean {
  return buf.length >= minBytes && !!detectImageMime(buf);
}

async function downloadImageWithValidation(
  url: string,
  outputPath: string,
  opts: { retries?: number; timeoutMs?: number; source: string; minBytes?: number },
): Promise<boolean> {
  try {
    const resp = await httpRetry(url, {}, opts.retries ?? 2, opts.timeoutMs ?? 30_000);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!isValidImageBuffer(buf, opts.minBytes ?? 1024)) {
      const preview = buf.toString('utf-8', 0, Math.min(180, buf.length)).replace(/\s+/g, ' ');
      console.error(`[WARN] ${opts.source} 返回非图片内容，已丢弃: ${preview}`);
      return false;
    }
    writeFileSync(outputPath, buf);
    console.error(`[INFO] ${opts.source} 下载成功: ${basename(outputPath)} (${(buf.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e) {
    console.error(`[WARN] ${opts.source} 下载失败: ${e}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function generateGemini(
  prompt: string, apiKey: string, aspectRatio: string, model = 'imagen-3.0-generate-002',
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    }),
  }, 3, 90_000);

  const data = await resp.json() as Record<string, unknown>;
  const predictions = (data.predictions ?? []) as Record<string, string>[];
  const b64 = predictions[0]?.bytesBase64Encoded;
  if (!b64) throw new Error(`Gemini API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function generateOpenAI(
  prompt: string, apiKey: string, size: string,
  model = 'gpt-image-1', baseUrl = 'https://api.openai.com/v1',
): Promise<Buffer> {
  const url = `${baseUrl}/images/generations`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, n: 1, quality: 'medium' }),
  }, 3, 120_000);

  const data = await resp.json() as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`OpenAI API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url) {
    const imgResp = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imgResp.arrayBuffer());
  }
  throw new Error('OpenAI API 未返回图片数据');
}

function inferMimeFromPath(path: string): string {
  const p = path.toLowerCase();
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function toDoubaoImageValue(imageInput: string): { raw: string; dataUrl: string } {
  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    return { raw: imageInput, dataUrl: imageInput };
  }
  const filePath = resolve(imageInput);
  const bytes = readFileSync(filePath);
  const b64 = bytes.toString('base64');
  const mime = inferMimeFromPath(filePath);
  return { raw: b64, dataUrl: `data:${mime};base64,${b64}` };
}

async function generateDoubao(
  prompt: string, apiKey: string, size: string,
  model = 'doubao-seedream-5-0-260128', baseUrl = 'https://ark.cn-beijing.volces.com/api/v3',
  imageInput?: string,
): Promise<Buffer> {
  const url = `${baseUrl}/images/generations`;
  const basePayload: Record<string, unknown> = {
    model,
    prompt,
    // Doubao 图生图对像素有下限，使用 >= 3686400 px 的尺寸
    size: imageInput ? '2560x1440' : size,
    n: 1,
    response_format: imageInput ? 'url' : 'b64_json',
    stream: false,
    watermark: false,
  };

  let payload = basePayload;
  if (imageInput) {
    const imageVal = toDoubaoImageValue(imageInput);
    payload = {
      ...basePayload,
      image: imageVal.raw,
      sequential_image_generation: 'disabled',
    };
  }

  let resp: Response;
  try {
    resp = await httpRetry(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 3, 90_000);
  } catch (e) {
    // image payload may require data URL format depending on endpoint behavior
    if (!imageInput) throw e;
    const imageVal = toDoubaoImageValue(imageInput);
    resp = await httpRetry(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...basePayload,
        image: imageVal.dataUrl,
        sequential_image_generation: 'disabled',
      }),
    }, 2, 90_000);
  }

  const data = await resp.json() as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`豆包 API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url?.startsWith('http')) {
    const imgResp = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imgResp.arrayBuffer());
  }
  throw new Error('豆包 API 未返回图片数据');
}

type GenerateFn = (prompt: string, apiKey: string, sizeOrRatio: string, model?: string, baseUrl?: string) => Promise<Buffer>;

/**
 * YouMind 生图：通过 Chat API（createChat）调用 AI 生图/搜图能力。
 * AI 会自动选择可用的生图工具或联网搜索匹配图片。
 */
async function generateYouMind(
  prompt: string, apiKey: string, _size: string,
  _model?: string, _baseUrl?: string,
): Promise<Buffer> {
  // 动态导入 youmind-api 的 chatGenerateImage
  const { chatGenerateImage } = await import('./youmind-api.js');
  const result = await chatGenerateImage(prompt);

  if (!result.imageUrls.length) {
    throw new Error('YouMind Chat 未返回图片 URL');
  }

  // 尝试获取高清原图 URL（去掉 /thumbnails/ /small/ 等缩略图路径）
  const fullSizeUrls = result.imageUrls.map(url => {
    let u = url;
    // vecteezy: /thumbnails/xxx/small/ → /previews/xxx/
    u = u.replace('/thumbnails/', '/previews/').replace(/\/small\//, '/');
    // pexels: ?w=500 → ?w=1280
    u = u.replace(/[?&]w=\d+/, '?w=1280');
    // unsplash: ?w=xxx → ?w=1280
    u = u.replace(/[?&]w=\d+/, '?w=1280');
    return u;
  });

  // 下载第一张图片（优先原图，失败则回退到缩略图）
  const allUrls = [...new Set([...fullSizeUrls, ...result.imageUrls])];
  for (const url of allUrls) {
    try {
      const resp = await httpRetry(url, {}, 1, 30_000);
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length > 1024) { // 至少 1KB 才算有效图片
        console.error(`[INFO] YouMind Chat 返回图片: ${url.slice(0, 80)}... (${(buf.length / 1024).toFixed(1)} KB)`);
        return buf;
      }
    } catch (e) {
      console.error(`[WARN] 下载图片失败 ${url.slice(0, 60)}: ${e}`);
    }
  }

  throw new Error(`YouMind Chat 返回了 ${result.imageUrls.length} 个图片 URL 但全部下载失败`);
}

async function generatePollinations(
  prompt: string,
  outputPath: string,
  size: 'cover' | 'article' = 'article',
): Promise<boolean> {
  const encoded = encodeURIComponent(prompt);
  const dims = size === 'cover' ? 'width=1536&height=1024' : 'width=1024&height=768';
  const seeds = [Date.now() % 100000, (Date.now() + 17) % 100000, (Date.now() + 37) % 100000];

  for (const seed of seeds) {
    const url = `https://image.pollinations.ai/prompt/${encoded}?${dims}&seed=${seed}&model=flux`;
    if (await downloadImageWithValidation(url, outputPath, {
      retries: 2,
      timeoutMs: 120_000,
      source: 'pollinations',
      minBytes: 8 * 1024,
    })) {
      return true;
    }
    // queue full often needs a short cooldown
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}

const GENERATORS: Record<string, GenerateFn> = {
  gemini: (p, k, s, m) => generateGemini(p, k, s, m),
  openai: (p, k, s, m, b) => generateOpenAI(p, k, s, m, b),
  doubao: (p, k, s, m, b) => generateDoubao(p, k, s, m, b),
  youmind: (p, k, s) => generateYouMind(p, k, s),
};

// ---------------------------------------------------------------------------
// Nano Banana Pro library search
// ---------------------------------------------------------------------------

interface NanaBananaPrompt {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  sourceMedia?: string[];
}

function searchNanoBanana(keywords: string, maxResults = 3): NanaBananaPrompt[] {
  const manifestPath = resolve(NANO_BANANA_REFS, 'manifest.json');
  if (!existsSync(manifestPath)) return [];

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const terms = keywords.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (!terms.length) return [];

  const scored: [number, NanaBananaPrompt][] = [];

  for (const cat of manifest.categories ?? []) {
    const catFile = resolve(NANO_BANANA_REFS, cat.file);
    if (!existsSync(catFile)) continue;
    try {
      const prompts: NanaBananaPrompt[] = JSON.parse(readFileSync(catFile, 'utf-8'));
      for (const p of prompts) {
        if (!p?.sourceMedia?.length) continue;
        const searchable = `${p.content ?? ''} ${p.title ?? ''} ${p.description ?? ''}`.toLowerCase();
        const score = terms.reduce((s, t) => s + (searchable.includes(t) ? 2 : 0), 0);
        if (score > 0) scored.push([score, p]);
      }
    } catch { /* skip bad files */ }
  }

  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, maxResults).map(([, p]) => p);
}

async function downloadNanaBananaImage(url: string, output: string): Promise<boolean> {
  return downloadImageWithValidation(url, output, {
    retries: 1,
    timeoutMs: 30_000,
    source: 'nano-banana-library',
    minBytes: 1024,
  });
}

// ---------------------------------------------------------------------------
// Fallback cover
// ---------------------------------------------------------------------------

function selectFallbackCover(color = '#3498db', mood = ''): string | null {
  const targetHue = COLOR_HUE_MAP[color.toLowerCase()] ?? 'blue';

  const candidates: [number, string][] = [];
  for (const [, meta] of Object.entries(COVER_PALETTE)) {
    let score = 0;
    if (meta.hue === targetHue) score += 3;
    if (mood && meta.mood === mood) score += 2;
    if (meta.tone === (['orange', 'warm'].includes(targetHue) ? 'warm' : 'cool')) score += 1;
    candidates.push([score, meta.url]);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b[0] - a[0]);
  return candidates[0][1];
}

async function downloadFallbackCover(url: string, output: string): Promise<boolean> {
  return downloadImageWithValidation(url, output, {
    retries: 2,
    timeoutMs: 30_000,
    source: 'fallback-cover',
    minBytes: 1024,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface CliArgs {
  prompt?: string;
  search?: string;
  output: string;
  size: 'cover' | 'article';
  provider?: string;
  fallbackCover: boolean;
  color: string;
  mood: string;
  referenceImage?: string;
  consistentPerson: boolean;
  theme?: string;
  scene?: string;
  style?: string;
  outfit?: string;
  light?: string;
  pose?: string;
  element?: string;
  historyFile?: string;
  stockDir?: string;
  articleId?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const output = get('--output') ?? get('-o');
  if (!output) { console.error('需要 --output 参数'); process.exit(1); }

  return {
    prompt: get('--prompt'),
    search: get('--search'),
    output,
    size: (get('--size') ?? 'cover') as 'cover' | 'article',
    provider: get('--provider'),
    fallbackCover: has('--fallback-cover'),
    color: get('--color') ?? '#3498db',
    mood: get('--mood') ?? '',
    referenceImage: get('--reference-image'),
    consistentPerson: has('--consistent-person'),
    theme: get('--theme'),
    scene: get('--scene'),
    style: get('--style'),
    outfit: get('--outfit'),
    light: get('--light'),
    pose: get('--pose'),
    element: get('--element'),
    historyFile: get('--history-file'),
    stockDir: get('--stock-dir'),
    articleId: get('--article-id'),
  };
}

function output(data: Record<string, unknown>) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const args = parseArgs();
  mkdirSync(dirname(resolve(args.output)), { recursive: true });
  const useConsistency = args.consistentPerson || !!args.referenceImage;
  const historyFile = args.historyFile || defaultHistoryFile(args.output);
  const imageHistory = readImageHistory(historyFile);
  const articleId = args.articleId || deriveArticleIdFromOutput(args.output);
  const usedPosesInArticle = new Set(
    imageHistory
      .filter(r => (r.articleId ?? '') === articleId)
      .map(r => r.modules?.pose)
      .filter((v): v is string => !!v),
  );
  const moduleOpts = {
    theme: args.theme,
    scene: args.scene,
    style: args.style,
    outfit: args.outfit,
    light: args.light,
    pose: args.pose,
    element: args.element,
    forbiddenPoses: Array.from(usedPosesInArticle),
  };

  const appendHistory = (entry: {
    source: string;
    prompt?: string;
    modules?: PromptModules;
    signature?: string;
  }) => {
    const next: ImageHistoryRecord = {
      date: new Date().toISOString(),
      file: resolve(args.output),
      source: entry.source,
      signature: entry.signature ?? (entry.modules ? modulesSignature(entry.modules) : ''),
      articleId,
      prompt: entry.prompt,
      modules: entry.modules,
    };
    imageHistory.push(next);
    writeImageHistory(historyFile, imageHistory);
  };

  if (args.referenceImage) {
    const isRemote = args.referenceImage.startsWith('http://') || args.referenceImage.startsWith('https://');
    if (!isRemote && !existsSync(resolve(args.referenceImage))) {
      output({ status: 'error', message: `参考图不存在: ${args.referenceImage}` });
      process.exit(1);
    }
  }

  if (args.pose && usedPosesInArticle.has(args.pose)) {
    output({
      status: 'error',
      message: `同一篇文章中姿势不可重复，当前姿势已使用: ${args.pose}`,
      article_id: articleId,
    });
    process.exit(1);
  }

  // --- Mode 1: Fallback cover ---
  if (args.fallbackCover) {
    const cover = selectFallbackCover(args.color, args.mood);
    if (cover && await downloadFallbackCover(cover, args.output)) {
      output({ status: 'ok', source: 'fallback', file: args.output });
    } else {
      output({ status: 'error', message: '无匹配的预制封面' });
      process.exit(1);
    }
    return;
  }

  // --- Mode 2: Nano Banana Pro library search ---
  if (args.search) {
    const selectedModules = useConsistency
      ? pickNonRecentModules(moduleOpts, imageHistory)
      : undefined;

    if (selectedModules) {
      const stock = chooseStockImageIfOldSimilar(
        imageHistory,
        modulesSignature(selectedModules),
        args.stockDir || resolve(dirname(args.output), 'stock'),
      );
      if (stock) {
        writeFileSync(args.output, readFileSync(stock));
        appendHistory({
          source: 'stock',
          modules: selectedModules,
          prompt: args.search,
          signature: modulesSignature(selectedModules),
        });
        output({
          status: 'ok',
          source: 'stock',
          file: args.output,
          stock_file: stock,
          modules: selectedModules,
        });
        return;
      }
    }

    const results = searchNanoBanana(args.search);
    for (const r of results) {
      if (r.sourceMedia?.[0] && await downloadNanaBananaImage(r.sourceMedia[0], args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'nano-banana-library',
            modules: selectedModules,
            prompt: args.search,
            signature: modulesSignature(selectedModules),
          });
        }
        output({
          status: 'ok', source: 'nano-banana-library', file: args.output,
          prompt_title: r.title ?? '', prompt_id: r.id,
          original_prompt: (r.content ?? '').slice(0, 200),
          ...(selectedModules ? { modules: selectedModules } : {}),
        });
        return;
      }
    }
    // Fallback to predefined cover
    const fallbackPrompt = selectedModules ? buildConsistentPrompt(selectedModules, args.search) : args.search;
    if (await generatePollinations(fallbackPrompt, args.output, args.size)) {
      if (selectedModules) {
        appendHistory({
          source: 'pollinations',
          modules: selectedModules,
          prompt: fallbackPrompt,
          signature: modulesSignature(selectedModules),
        });
      }
      output({
        status: 'ok',
        source: 'pollinations',
        file: args.output,
        search: args.search,
        ...(selectedModules ? { modules: selectedModules, prompt: fallbackPrompt } : {}),
      });
      return;
    }

    // Fallback to predefined cover
    if (args.size === 'cover') {
      const cover = selectFallbackCover(args.color, args.mood);
      if (cover && await downloadFallbackCover(cover, args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'fallback',
            modules: selectedModules,
            prompt: fallbackPrompt,
            signature: modulesSignature(selectedModules),
          });
        }
        output({ status: 'ok', source: 'fallback', file: args.output });
        return;
      }
    }
    output({ status: 'no_match', search: args.search, message: '库中无匹配，请尝试 --prompt 配合 API 生图' });
    return;
  }

  // --- Mode 3: API generation ---
  const selectedModules = useConsistency
    ? pickNonRecentModules(moduleOpts, imageHistory)
    : undefined;

  const finalPrompt = selectedModules ? buildConsistentPrompt(selectedModules, args.prompt) : args.prompt;

  if (!finalPrompt) {
    console.error('需要 --prompt 或 --search 参数');
    process.exit(1);
  }

  if (selectedModules) {
    const stock = chooseStockImageIfOldSimilar(
      imageHistory,
      modulesSignature(selectedModules),
      args.stockDir || resolve(dirname(args.output), 'stock'),
    );
    if (stock) {
      writeFileSync(args.output, readFileSync(stock));
      appendHistory({
        source: 'stock',
        modules: selectedModules,
        prompt: finalPrompt,
        signature: modulesSignature(selectedModules),
      });
      output({
        status: 'ok',
        source: 'stock',
        file: args.output,
        stock_file: stock,
        modules: selectedModules,
        prompt: finalPrompt,
      });
      return;
    }
  }

  const config = loadConfig();
  const [providerName, providerCfg] = resolveProvider(config, args.provider);

  if (!providerCfg.api_key) {
    console.error('[WARN] 无可用的 API key，尝试降级方案...');
    // Fallback 1: search Nano Banana Pro library
    const searchTerms = finalPrompt.replace(/[,，。.!！?？"'\-—()（）[\]]/g, ' ');
    const results = searchNanoBanana(searchTerms);
    if (results.length && results[0].sourceMedia?.[0]) {
      if (await downloadNanaBananaImage(results[0].sourceMedia[0], args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'nano-banana-library',
            modules: selectedModules,
            prompt: finalPrompt,
            signature: modulesSignature(selectedModules),
          });
        }
        output({
          status: 'ok', source: 'nano-banana-library', file: args.output,
          message: '无 API key，已从 Nano Banana Pro 库匹配示例图', prompt_id: results[0].id,
          ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
        });
        return;
      }
    }
    // Fallback 2: pollinations fallback
    if (await generatePollinations(finalPrompt, args.output, args.size)) {
      if (selectedModules) {
        appendHistory({
          source: 'pollinations',
          modules: selectedModules,
          prompt: finalPrompt,
          signature: modulesSignature(selectedModules),
        });
      }
      output({
        status: 'ok', source: 'pollinations', file: args.output,
        message: '无 API key，已使用 Pollinations 兜底生图',
        ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
      });
      return;
    }

    // Fallback 3: predefined cover
    if (args.size === 'cover') {
      const cover = selectFallbackCover(args.color, args.mood);
      if (cover && await downloadFallbackCover(cover, args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'fallback',
            modules: selectedModules,
            prompt: finalPrompt,
            signature: modulesSignature(selectedModules),
          });
        }
        output({ status: 'ok', source: 'fallback', file: args.output, prompt: finalPrompt });
        return;
      }
    }
    // Fallback 4: prompt only
    output({
      status: 'prompt_only', prompt: args.prompt,
      message: '无可用 API key。请在 config.yaml 中配置 image.providers 的 api_key',
      ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
    });
    return;
  }

  const genFn = GENERATORS[providerName];
  if (!genFn) {
    console.error(`未知 provider: ${providerName} (支持: youmind, gemini, openai, doubao)`);
    process.exit(1);
  }

  const sizeVal = SIZE_MAP[args.size][providerName] ?? SIZE_MAP[args.size].openai;

  try {
    const imageBytes = providerName === 'doubao' && args.referenceImage
      ? await generateDoubao(
        finalPrompt,
        providerCfg.api_key!,
        sizeVal,
        providerCfg.model,
        providerCfg.base_url,
        args.referenceImage,
      )
      : await genFn(
        finalPrompt,
        providerCfg.api_key!,
        sizeVal,
        providerCfg.model,
        providerCfg.base_url,
      );
    if (!isValidImageBuffer(imageBytes, 1024)) {
      throw new Error(`${providerName} 返回内容不是有效图片`);
    }
    writeFileSync(args.output, imageBytes);
    if (args.referenceImage && existsSync(resolve(args.referenceImage))) {
      const outHash = fileSha256(args.output);
      const refHash = fileSha256(resolve(args.referenceImage));
      if (outHash === refHash) {
        throw new Error('生成结果与参考图完全一致，已拒绝本次结果');
      }
    }
    if (selectedModules) {
      appendHistory({
        source: providerName,
        modules: selectedModules,
        prompt: finalPrompt,
        signature: modulesSignature(selectedModules),
      });
    }
    console.error(`[INFO] 图片已保存: ${args.output} (${(imageBytes.length / 1024).toFixed(1)} KB)`);
    output({
      status: 'ok',
      source: providerName,
      file: args.output,
      ...(args.referenceImage ? { reference_image: args.referenceImage } : {}),
      ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
    });
  } catch (e) {
    console.error(`[ERROR] ${providerName} 生图失败: ${e}`);
    // Fallback to Nano Banana Pro library
    const searchTerms = finalPrompt.replace(/[,，。.!！?？"'\-—()（）[\]]/g, ' ');
    const results = searchNanoBanana(searchTerms);
    if (results.length && results[0].sourceMedia?.[0]) {
      if (await downloadNanaBananaImage(results[0].sourceMedia[0], args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'nano-banana-library',
            modules: selectedModules,
            prompt: finalPrompt,
            signature: modulesSignature(selectedModules),
          });
        }
        output({
          status: 'ok',
          source: 'nano-banana-library',
          file: args.output,
          api_error: String(e),
          ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
        });
        return;
      }
    }
    if (await generatePollinations(finalPrompt, args.output, args.size)) {
      if (selectedModules) {
        appendHistory({
          source: 'pollinations',
          modules: selectedModules,
          prompt: finalPrompt,
          signature: modulesSignature(selectedModules),
        });
      }
      output({
        status: 'ok',
        source: 'pollinations',
        file: args.output,
        api_error: String(e),
        ...(selectedModules ? { modules: selectedModules, prompt: finalPrompt } : {}),
      });
      return;
    }
    if (args.size === 'cover') {
      const cover = selectFallbackCover(args.color, args.mood);
      if (cover && await downloadFallbackCover(cover, args.output)) {
        if (selectedModules) {
          appendHistory({
            source: 'fallback',
            modules: selectedModules,
            prompt: finalPrompt,
            signature: modulesSignature(selectedModules),
          });
        }
        output({ status: 'ok', source: 'fallback', file: args.output, api_error: String(e) });
        return;
      }
    }
    output({
      status: 'error',
      message: String(e),
      prompt: finalPrompt,
      ...(selectedModules ? { modules: selectedModules } : {}),
    });
    process.exit(1);
  }
}

// Export for module usage
export {
  generateGemini, generateOpenAI, generateDoubao,
  generatePollinations, searchNanoBanana, selectFallbackCover, downloadFallbackCover, resolveProvider,
  GENERATORS, SIZE_MAP,
};
export { COVER_PALETTE, COLOR_HUE_MAP } from './cover-assets.js';

const isMain = process.argv[1]?.includes('image-gen');
if (isMain) main().catch(e => { console.error(e); process.exit(1); });
