'use strict';

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Generate a pillar-branded image with DALL-E 3, returns a PNG Buffer */
async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json'
  });
  return Buffer.from(response.data[0].b64_json, 'base64');
}

module.exports = { generateImage };
