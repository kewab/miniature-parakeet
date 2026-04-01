/**
 * WeChat draft creation API wrapper.
 */
export interface DraftResult {
    mediaId: string;
}
export interface CreateDraftOptions {
    accessToken: string;
    title: string;
    html: string;
    digest: string;
    thumbMediaId?: string;
    author?: string;
}
export declare function createDraft(options: CreateDraftOptions): Promise<DraftResult>;
