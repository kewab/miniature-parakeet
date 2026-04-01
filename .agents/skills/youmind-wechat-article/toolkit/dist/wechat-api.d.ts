/**
 * WeChat API utilities: access token, image upload, cover upload.
 */
export declare function getAccessToken(appid: string, secret: string, forceRefresh?: boolean): Promise<string>;
export declare function uploadImage(accessToken: string, imagePath: string): Promise<string>;
export declare function uploadThumb(accessToken: string, imagePath: string): Promise<string>;
