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
    <div className="text-sm leading-relaxed space-y-3 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="first:mt-0 last:mb-0">{children}</p>,

          h1: ({ children }) => <h3 className="text-sm font-semibold mt-4 first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-semibold mt-4 first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold mt-3 first:mt-0">{children}</h4>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 first:mt-0">{children}</h4>,

          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,

          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          a: ({ href, children }) => (
            <a
              href={href}
              // Model-supplied links are untrusted: never hand the opener a
              // window reference, and never leak the referrer.
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              {children}
            </a>
          ),

          code: ({ children }) => (
            <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-white/[0.04] p-3 text-xs">{children}</pre>
          ),

          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Comparison tables are the main reason markdown matters here, and
          // they are the one element that can exceed the bubble — so the table
          // scrolls inside its own container rather than widening the page.
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/[0.04]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-white/[0.08] px-3 py-2 text-left font-medium whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/[0.04] px-3 py-2 align-top">{children}</td>
          ),

          hr: () => <hr className="border-white/[0.08]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
