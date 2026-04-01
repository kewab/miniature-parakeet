/**
 * WeChat draft creation API wrapper.
 */
export async function createDraft(options) {
    const { accessToken, title, html, digest, thumbMediaId, author } = options;
    const article = {
        title,
        author: author || '',
        digest,
        content: html,
        show_cover_pic: 0,
    };
    if (thumbMediaId) {
        article.thumb_media_id = thumbMediaId;
    }
    const body = { articles: [article] };
    const resp = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
    });
    const data = (await resp.json());
    const errcode = data.errcode ?? 0;
    if (errcode !== 0) {
        throw new Error(`WeChat create_draft error: errcode=${errcode}, errmsg=${data.errmsg ?? 'unknown'}`);
    }
    if (!data.media_id) {
        throw new Error(`WeChat create_draft error: missing media_id in response: ${JSON.stringify(data)}`);
    }
    return { mediaId: data.media_id };
}
