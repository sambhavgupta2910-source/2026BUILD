'use strict';

const FormData = require('form-data');

const PUBLORA_TOKEN = process.env.PUBLORA_TOKEN;
const PUBLORA_API   = 'https://api.publora.com/v1';

/** Upload an image buffer to Publora, returns media_id */
async function uploadImage(imageBuffer) {
  const form = new FormData();
  form.append('file', imageBuffer, { filename: 'post-image.png', contentType: 'image/png' });
  const res = await fetch(`${PUBLORA_API}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PUBLORA_TOKEN}`, ...form.getHeaders() },
    body: form
  });
  if (!res.ok) throw new Error(`Publora media upload failed: ${res.status} ${await res.text()}`);
  const { media_id } = await res.json();
  return media_id;
}

/** Publish a post to LinkedIn via Publora. mediaId is optional. */
async function publish(content, mediaId) {
  const body = { network: 'linkedin', content, publish_now: true };
  if (mediaId) body.media_ids = [mediaId];

  const res = await fetch(`${PUBLORA_API}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PUBLORA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Publora publish failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = { uploadImage, publish };
