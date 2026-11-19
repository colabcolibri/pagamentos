'use client'

import React from 'react'

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('[')) {
      const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (m) {
        parts.push(
          <a
            key={key++}
            href={m[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4 hover:opacity-80"
          >
            {m[1]}
          </a>
        )
      } else {
        parts.push(token)
      }
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

export function MarkdownViewer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let blockKey = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Code block ```lang
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !(lines[i] ?? '').trimStart().startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i += 1
      }
      i += 1
      blocks.push(
        <div
          key={blockKey++}
          className="my-4 overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100"
        >
          {lang && (
            <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={blockKey++} className="my-6 border-border" />)
      i += 1
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      const text = headingMatch[2]!
      const cls =
        level === 1
          ? 'mt-2 mb-4 text-2xl font-bold tracking-tight text-foreground'
          : level === 2
            ? 'mt-7 mb-3 border-b pb-1.5 text-lg font-semibold tracking-tight text-foreground'
            : level === 3
              ? 'mt-5 mb-2 text-base font-semibold text-foreground'
              : 'mt-4 mb-1.5 text-sm font-semibold text-foreground'
      blocks.push(
        <div key={blockKey++} className={cls}>
          {renderInline(text)}
        </div>
      )
      i += 1
      continue
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('> ')) {
        quoteLines.push((lines[i] ?? '').trimStart().slice(2))
        i += 1
      }
      blocks.push(
        <blockquote
          key={blockKey++}
          className="my-3 border-l-4 border-primary/50 bg-muted/40 py-2 pl-4 pr-3 text-sm text-muted-foreground"
        >
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      )
      continue
    }

    // Table
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|[\s:-]+\|/.test(lines[i + 1] ?? '')
    ) {
      const parseRow = (r: string) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      const headers = parseRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(parseRow(lines[i] ?? ''))
        i += 1
      }
      blocks.push(
        <div key={blockKey++} className="my-4 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 font-medium">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 align-top text-muted-foreground">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul
          key={blockKey++}
          className="my-3 list-disc space-y-1.5 pl-6 text-sm text-muted-foreground"
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol
          key={blockKey++}
          className="my-3 list-decimal space-y-1.5 pl-6 text-sm text-muted-foreground"
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Empty line
    if (!line.trim()) {
      i += 1
      continue
    }

    // Paragraph
    const paraLines: string[] = [line]
    i += 1
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,4}\s|```|---+$|>\s|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i] ?? '')
    ) {
      paraLines.push(lines[i] ?? '')
      i += 1
    }
    blocks.push(
      <p key={blockKey++} className="my-2.5 text-sm leading-relaxed text-muted-foreground">
        {renderInline(paraLines.join(' '))}
      </p>
    )
  }

  return <div className="max-w-none">{blocks}</div>
}
