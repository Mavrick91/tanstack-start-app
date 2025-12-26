import { cn } from '../../lib/utils'

type RichTextContentProps = {
  html: string
  className?: string
}

/**
 * Renders HTML content safely with proper styling.
 * Used for displaying rich text editor content on the storefront.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  if (!html || html === '<p></p>') {
    return null
  }

  return (
    <>
      <div
        className={cn('rich-text-display', className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .rich-text-display h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .rich-text-display h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .rich-text-display p {
          margin: 0.75rem 0;
          line-height: 1.7;
        }
        .rich-text-display ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .rich-text-display ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .rich-text-display li {
          margin: 0.375rem 0;
          line-height: 1.6;
        }
        .rich-text-display blockquote {
          border-left: 3px solid hsl(var(--primary) / 0.3);
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .rich-text-display a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .rich-text-display a:hover {
          opacity: 0.8;
        }
        .rich-text-display strong {
          font-weight: 600;
        }
        .rich-text-display em {
          font-style: italic;
        }
        .rich-text-display hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5rem 0;
        }
      `}</style>
    </>
  )
}
