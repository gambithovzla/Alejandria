interface ReaderMarkdownProps {
  markdown: string
}

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'quote'; text: string }

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []

  let index = 0
  while (index < lines.length) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (!line) {
      index += 1
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      })
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'bullet-list', items })
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s+/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') })
      continue
    }

    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !/^>\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

export function ReaderMarkdown({ markdown }: ReaderMarkdownProps) {
  const blocks = parseMarkdown(markdown)

  if (blocks.length === 0) {
    return <p className="text-base leading-8 text-ink/72">Todavia no hay texto aprobado para mostrar en esta unidad.</p>
  }

  return (
    <div className="reader-prose">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl text-ink" key={`heading-${index}`}>
                {block.text}
              </h1>
            )
          }
          if (block.level === 2) {
            return (
              <h2 className="mt-8 font-[family-name:var(--font-display)] text-3xl text-ink" key={`heading-${index}`}>
                {block.text}
              </h2>
            )
          }
          return (
            <h3 className="mt-8 text-xl font-semibold text-ink" key={`heading-${index}`}>
              {block.text}
            </h3>
          )
        }

        if (block.type === 'bullet-list') {
          return (
            <ul className="mt-6 list-disc space-y-3 pl-6 text-lg leading-8 text-ink/82" key={`list-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ordered-list') {
          return (
            <ol className="mt-6 list-decimal space-y-3 pl-6 text-lg leading-8 text-ink/82" key={`ordered-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )
        }

        if (block.type === 'quote') {
          return (
            <blockquote className="mt-6 border-l-2 border-brass/30 pl-5 italic text-ink/72" key={`quote-${index}`}>
              {block.text}
            </blockquote>
          )
        }

        return (
          <p className="mt-6 text-lg leading-9 text-ink/84" key={`paragraph-${index}`}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
