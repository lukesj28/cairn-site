import { FAQ, TOPIC, CONTEXT } from './faq.js'

const MODEL = '@cf/zai-org/glm-4.7-flash'
const MAX_TOKENS = 256
const EMBED = '@cf/baai/bge-small-en-v1.5'
const RELEVANT = 0.65
const FAQ_MATCH = 0.85

const texts = [...FAQ.flatMap((f) => f.q), ...TOPIC]
const faqIndex = [...FAQ.flatMap((f, i) => f.q.map(() => i)), ...TOPIC.map(() => -1)]
let refs
const embed = async (env, text) => (await env.AI.run(EMBED, { text, pooling: 'cls' })).data

const cos = (a, b) => {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / Math.sqrt(normA * normB)
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const json = (data, init = {}) =>
  Response.json(data, {
    ...init,
    headers: { ...SECURITY_HEADERS, ...init.headers },
  })

const text = (msg, status = 200) =>
  new Response(msg, {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  })

const limited = () => json({ error: 'rate_limited' }, { status: 429 })

function isAllowedOrigin(request) {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false
  }
  const origin = request.headers.get('origin')
  if (origin) {
    const url = new URL(request.url)
    if (origin !== url.origin) return false
  }
  return true
}

async function chat(request, env) {
  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > 500) {
    return text('message required', 400)
  }

  const history = []
  if (Array.isArray(body?.history)) {
    const raw = body.history.slice(-10)
    const startIdx = raw.findIndex((h) => h?.role === 'user')
    if (startIdx >= 0) {
      let expectedRole = 'user'
      for (const h of raw.slice(startIdx)) {
        if (h && h.role === expectedRole && typeof h.content === 'string') {
          const content = h.content.trim().slice(0, 1000)
          if (content) {
            history.push({ role: h.role, content })
            expectedRole = expectedRole === 'user' ? 'assistant' : 'user'
          }
        }
      }
      if (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop()
      }
    }
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'anon'
  if (!(await env.CHAT_LIMIT.limit({ key: ip })).success) return limited()

  try {
    refs ??= embed(env, texts).catch((err) => {
      refs = null
      throw err
    })
    const recentContext = history.slice(-2).map((h) => h.content).join('\n')
    const queryText = recentContext ? `${recentContext}\n${message}` : message
    const [vecs, q] = await Promise.all([refs, embed(env, queryText)])

    let bestScore = -1
    let bestFaqScore = -1
    let bestFaqIndex = -1

    for (let i = 0; i < vecs.length; i++) {
      const score = cos(q[0], vecs[i])
      if (score > bestScore) bestScore = score
      if (faqIndex[i] >= 0 && score > bestFaqScore) {
        bestFaqScore = score
        bestFaqIndex = faqIndex[i]
      }
    }

    if (bestScore < RELEVANT) return json({ source: 'refusal', reply: 'I can only help with questions about cairn.' })
    if (!history.length && bestFaqScore >= FAQ_MATCH) return json({ source: 'faq', reply: FAQ[bestFaqIndex].a })

    if (!(await env.LLM_LIMIT.limit({ key: ip })).success) return limited()
    const out = await env.AI.run(MODEL, {
      messages: [
        {
          role: 'system',
          content: CONTEXT + ' Answer briefly and directly, using conversation history to resolve follow-up questions. Only answer about cairn; if unsure, point to the README.',
        },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: MAX_TOKENS,
      chat_template_kwargs: { enable_thinking: false },
    })
    const reply = out.response ?? out.choices?.[0]?.message?.content
    if (!reply) return json({ error: 'llm_failed' }, { status: 502 })
    return json({ source: 'llm', reply })
  } catch (e) {
    console.error(e)
    return json({ error: 'upstream' }, { status: 502 })
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/chat') {
      if (request.method !== 'POST') return text('Method not allowed', 405)
      if (!isAllowedOrigin(request)) return text('Forbidden', 403)
      return chat(request, env)
    }
    return text('Not found', 404)
  },
}
