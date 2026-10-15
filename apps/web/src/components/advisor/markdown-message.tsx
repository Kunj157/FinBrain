import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders an advisor reply.
 *
 * The model answers in markdown — headings, bullets, and tables comparing
 * before/after figures — which the chat bubble used to print verbatim, so
 * users saw literal `**`, `###` and pipe-delimited table rows.
 *
 * react-markdown escapes HTML in the source by default and no raw-HTML plugin
 * is enabled here, which matters because the reply is untrusted model output.
 */
export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="space-y-3 break-words text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="first:mt-0 last:mb-0">{children}</p>,

          h1: ({ children }) => <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h4>,
          h4: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h4>,

          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5 marker:text-accent/70">{children}</li>,

          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          a: ({ href, children }) => (
            <a
              href={href}
              // Model-supplied links are untrusted: never hand the opener a
              // window reference, and never leak the referrer.
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),

          code: ({ children }) => (
            <code className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-foreground/[0.04] p-3 text-xs">{children}</pre>
          ),

          blockquote: ({ children }) => (
            <blockquote className="rounded-r-lg border-l-2 border-accent/50 bg-accent/[0.05] py-1.5 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Comparison tables are the main reason markdown matters here, and
          // they are the one element that can exceed the bubble — so the table
          // scrolls inside its own container rather than widening the page.
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border bg-background/40">
              <table className="w-full border-collapse text-xs tabular-nums">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-foreground/[0.04]">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-foreground/[0.04] px-3 py-2 align-top">{children}</td>
          ),

          hr: () => <hr className="border-foreground/[0.08]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
