/**
 * WeChat API utilities: access token, image upload, cover upload.
 */
import { basename } from 'node:path';
const tokenCache = new Map();
export async function getAccessToken(appid, secret, forceRefresh = false) {
    const now = Date.now() / 1000;
    if (!forceRefresh && tokenCache.has(appid)) {
        const cached = tokenCache.get(appid);
        if (now < cached.expiresAt)
            return cached.accessToken;
    }
    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', appid);
    url.searchParams.set('secret', secret);
    const resp = await fetch(url.toString());
    const data = (await resp.json());
    if (!data.access_token) {
        throw new Error(`WeChat API error: errcode=${data.errcode ?? 'unknown'}, errmsg=${data.errmsg ?? 'unknown'}`);
    }
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 7200;
    tokenCache.set(appid, {
        accessToken,
        expiresAt: now + expiresIn - 300,
    });
    return accessToken;
}
export async function uploadImage(accessToken, imagePath) {
    const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`;
    const buffer = await import('node:fs/promises').then(fs => fs.readFile(imagePath));
    const ext = basename(imagePath).split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    const blob = new Blob([buffer], { type: mimeMap[ext] || 'image/jpeg' });
    const formData = new FormData();
    formData.append('media', blob, basename(imagePath));
    const resp = await fetch(url, { method: 'POST', body: formData });
    const data = (await resp.json());
    if (!data.url) {
        throw new Error(`WeChat upload_image error: errcode=${data.errcode ?? 'unknown'}, errmsg=${data.errmsg ?? 'unknown'}`);
    }
    return data.url;
}
export async function uploadThumb(accessToken, imagePath) {
    const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=thumb`;
    const buffer = await import('node:fs/promises').then(fs => fs.readFile(imagePath));
    const ext = basename(imagePath).split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    const blob = new Blob([buffer], { type: mimeMap[ext] || 'image/jpeg' });
    const formData = new FormData();
    formData.append('media', blob, basename(imagePath));
    const resp = await fetch(url, { method: 'POST', body: formData });
    const data = (await resp.json());
    if (!data.media_id) {
        throw new Error(`WeChat upload_thumb error: errcode=${data.errcode ?? 'unknown'}, errmsg=${data.errmsg ?? 'unknown'}`);
    }
    return data.media_id;
}
