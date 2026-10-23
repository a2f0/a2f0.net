/**
 * Serializes structured data for a `<script type="application/ld+json">`
 * element. Escaping `<` keeps a `</script>` inside the data from closing the
 * element early; JSON parsers read the escape back as `<`.
 */
export function serializeJsonLd(data: Readonly<Record<string, unknown>>) {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
