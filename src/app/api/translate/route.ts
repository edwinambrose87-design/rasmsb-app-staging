import { NextResponse } from 'next/server'

type TargetLanguage = 'ms' | 'ne'

const supportedLanguages: TargetLanguage[] = ['ms', 'ne']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = String(body?.text || '').trim()
    const target = String(body?.target || '') as TargetLanguage

    if (!text) {
      return NextResponse.json({ translatedText: '' })
    }

    if (!supportedLanguages.includes(target)) {
      return NextResponse.json({ error: 'Unsupported target language.' }, { status: 400 })
    }

    const translatedText = await translateText(text, target)
    return NextResponse.json({ translatedText })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Translation failed.' }, { status: 500 })
  }
}

async function translateText(text: string, target: TargetLanguage) {
  const chunks = splitIntoChunks(text)
  const translatedChunks = await Promise.all(chunks.map(chunk => translateChunk(chunk, target)))
  return translatedChunks.join('\n').trim()
}

async function translateChunk(text: string, target: TargetLanguage) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: target,
    dt: 't',
    q: text
  })

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    headers: {
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Translation service unavailable.')
  }

  const payload = await response.json()
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map((segment: any[]) => segment?.[0] || '').join('')
    : ''

  return translated || text
}

function splitIntoChunks(text: string) {
  const lines = text.split(/\r?\n/)
  const chunks: string[] = []
  let current = ''

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line
    if (next.length > 900 && current) {
      chunks.push(current)
      current = line
    } else {
      current = next
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}
