// Renders a JSON-LD structured-data block. Works in both server and client
// components; search engines read it for rich results.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here; "<" is escaped to keep </script> unbreakable
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
