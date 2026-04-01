/**
 * YouMind OpenAPI client — knowledge mining, search, web search, and article archiving.
 *
 * Usage (CLI):
 *   npx tsx src/youmind-api.ts search "AI 大模型" --top-k 10
 *   npx tsx src/youmind-api.ts web-search "今日AI热点" --freshness day
 *   npx tsx src/youmind-api.ts list-boards
 *   npx tsx src/youmind-api.ts list-materials <board_id>
 *   npx tsx src/youmind-api.ts list-crafts <board_id>
 *   npx tsx src/youmind-api.ts get-material <id>
 *   npx tsx src/youmind-api.ts get-craft <id>
 *   npx tsx src/youmind-api.ts save-article <board_id> --title "..." --file article.md
 *   npx tsx src/youmind-api.ts mine-topics "AI,产品设计" --board <board_id> --top-k 5
 */
interface YouMindConfig {
    apiKey: string;
    baseUrl: string;
}
export interface SearchResult {
    entity_id?: string;
    entity_type?: string;
    metadata?: {
        title?: string;
        content?: string;
        [k: string]: unknown;
    };
    id?: string;
    title?: string;
    content?: string;
    type?: string;
    score?: number;
    [key: string]: unknown;
}
export interface SearchResponse {
    results: SearchResult[];
    [key: string]: unknown;
}
export interface SearchOptions {
    query: string;
    topK?: number;
    filterTypes?: ('article' | 'note' | 'page')[];
    filterSourceIds?: string[];
    filterFields?: ('title' | 'content')[];
    filterUpdatedAt?: {
        from?: number;
        to?: number;
    };
}
export declare function search(opts: SearchOptions, config?: YouMindConfig): Promise<SearchResponse>;
export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    date_published?: string | null;
    [key: string]: unknown;
}
export interface WebSearchResponse {
    results: WebSearchResult[];
    formatted_context?: string | null;
    total_results?: number | null;
    [key: string]: unknown;
}
export interface WebSearchOptions {
    query: string;
    freshness?: 'day' | 'week' | 'month' | 'year';
    includeDomains?: string[];
    excludeDomains?: string[];
}
export declare function webSearch(opts: WebSearchOptions, config?: YouMindConfig): Promise<WebSearchResponse>;
export interface Board {
    id: string;
    name: string;
    type?: string;
    count?: number;
    [key: string]: unknown;
}
export declare function listBoards(config?: YouMindConfig): Promise<Board[]>;
export declare function getBoard(id: string, config?: YouMindConfig): Promise<Board>;
export interface Material {
    id: string;
    title?: string;
    content?: string;
    type?: string;
    board_id?: string;
    url?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
export declare function listMaterials(boardId: string, groupId?: string, config?: YouMindConfig): Promise<Material[]>;
export declare function getMaterial(id: string, config?: YouMindConfig): Promise<Material>;
export interface Craft {
    id: string;
    title?: string;
    content?: string;
    type?: string;
    board_id?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
export declare function listCrafts(boardId: string, groupId?: string, config?: YouMindConfig): Promise<Craft[]>;
export declare function getCraft(id: string, config?: YouMindConfig): Promise<Craft>;
export interface SavedDocument {
    id: string;
    title: string;
    board_id: string;
    [key: string]: unknown;
}
export declare function saveArticle(boardId: string, title: string, markdownContent: string, config?: YouMindConfig): Promise<SavedDocument>;
export interface MinedContent {
    source: 'search' | 'material' | 'craft';
    id: string;
    title: string;
    snippet: string;
    relevance?: number;
    updatedAt?: string;
}
export interface MineTopicsOptions {
    topics: string[];
    boardIds?: string[];
    topK?: number;
}
/**
 * 从用户的 YouMind 知识库中挖掘与选题相关的素材。
 * 组合语义搜索 + board 浏览，返回去重后的相关内容摘要。
 */
export declare function mineTopics(opts: MineTopicsOptions, config?: YouMindConfig): Promise<MinedContent[]>;
export interface ChatImageResult {
    chatId: string;
    imageUrls: string[];
    text: string;
}
/**
 * 通过 YouMind Chat API (agent 模式) AI 生图。
 * 流程: createChat(agent) → agent 自动加载 imageGenerate 工具并生图
 *       → 轮询 listMessages 等待 cdn.gooo.ai 图片 URL 出现。
 */
export declare function chatGenerateImage(prompt: string, config?: YouMindConfig): Promise<ChatImageResult>;
export {};
