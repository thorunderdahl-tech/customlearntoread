'use strict';

// AI caption generation via the Anthropic Messages API (official SDK, lazy-loaded).
// Falls back to deterministic templated captions when ANTHROPIC_API_KEY is unset,
// so the Studio workflow runs end-to-end with no credentials. This is independent
// of DRY_RUN — DRY_RUN gates *publishing*, not content tooling.

const config = require('./config');
const logger = require('./logger');

function titleCase(str = '') {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function stubCaptions({ childName, theme, count }) {
  const name = titleCase(childName || 'your child');
  const t = titleCase(theme || 'reading adventure');
  const tag = '#LearnToRead #PersonalizedBooks #CustomLearnToRead';
  const templates = [
    `${name} is the hero of their very own ${t} story 📖✨ Personalized books that put your child's name on every page. Link in bio. ${tag}`,
    `Imagine ${name}'s face when they see their name in a real book 🥹 A ${t} made just for them. ${tag}`,
    `Reading clicks when the story is about you. Meet ${name}'s ${t} adventure 🌟 ${tag}`,
    `Every page says ${name}. Every word builds a reader. A ${t} book made for your little one 💛 ${tag}`,
    `${name} + a ${t} they'll want to read again and again 📚 Personalized learn-to-read books. ${tag}`,
  ];
  return templates.slice(0, Math.max(1, Math.min(count, templates.length)));
}

const SYSTEM = `You are a social media copywriter for Custom Learn to Read, a brand selling personalized "learn-to-read" children's books that put a child's own name and chosen theme on every page. Write warm, parent-facing captions that are concrete and specific, avoid generic marketing fluff, and include 2-4 relevant hashtags. Vary structure and opening across captions. Keep each under 300 characters.`;

const SCHEMA = {
  type: 'object',
  properties: {
    captions: { type: 'array', items: { type: 'string' } },
  },
  required: ['captions'],
  additionalProperties: false,
};

// Returns { generated: boolean, model: string, captions: string[] }.
async function generateCaptions({ childName, theme, channel = 'instagram', count = 3 }) {
  count = Math.max(1, Math.min(Number(count) || 3, 5));

  if (!config.anthropic.apiKey) {
    logger.info(`captions: no ANTHROPIC_API_KEY — returning ${count} templated captions`);
    return { generated: false, model: 'stub', captions: stubCaptions({ childName, theme, count }) };
  }

  const Anthropic = require('@anthropic-ai/sdk'); // lazy: only when actually calling the API
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const prompt =
    `Write ${count} distinct ${channel} captions for a personalized learn-to-read book ` +
    `starring a child named "${childName || 'the child'}" with the theme "${theme || 'a reading adventure'}". ` +
    `Return them as a JSON object: {"captions": ["...", ...]}.`;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1024,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';
  const parsed = JSON.parse(text);
  const captions = Array.isArray(parsed.captions) ? parsed.captions.slice(0, count) : [];
  logger.info(`captions: generated ${captions.length} via ${response.model}`);
  return { generated: true, model: response.model, captions };
}

module.exports = { generateCaptions, stubCaptions };
