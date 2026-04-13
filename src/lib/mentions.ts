/**
 * Mention token format — identical in the admin and vendor portals.
 *
 * Tokens are plain text embedded in chat_messages.body:
 *
 *   <@order:FAIRE_ORDER_ID>
 *   <@order:FAIRE_ORDER_ID|PrettyLabel>
 *   <@user:USER_NAME>
 *
 * See external/vendor-portal/src/lib/mentions.ts for the identical
 * implementation on the vendor side. Keep the two files in sync — the
 * contract is "same token produces same structured segments everywhere".
 */

export type MentionKind = "order" | "user"

export interface Mention {
  kind: MentionKind
  id: string
  label?: string
}

export type Segment =
  | { type: "text"; text: string }
  | { type: "mention"; mention: Mention }

const MENTION_RE = /<@(order|user):([^>|]+)(?:\|([^>]+))?>/g

export function parseMentionedBody(body: string): Segment[] {
  const out: Segment[] = []
  let lastIndex = 0

  for (const match of body.matchAll(MENTION_RE)) {
    const [full, rawKind, id, label] = match
    const start = match.index ?? 0
    if (start > lastIndex) {
      out.push({ type: "text", text: body.slice(lastIndex, start) })
    }
    out.push({
      type: "mention",
      mention: {
        kind: rawKind as MentionKind,
        id: id.trim(),
        label: label?.trim(),
      },
    })
    lastIndex = start + full.length
  }

  if (lastIndex < body.length) {
    out.push({ type: "text", text: body.slice(lastIndex) })
  }

  return out
}

export function formatMentionToken(mention: Mention): string {
  const base = `<@${mention.kind}:${mention.id}`
  return mention.label ? `${base}|${mention.label}>` : `${base}>`
}

/**
 * Quick heuristic: is this body pure plaintext with possibly mentions
 * (no HTML tags from the RichTextEditor)? We use this to decide whether
 * to render via <MessageBody> (plain + mention chips) or via the
 * existing <RichTextRenderer> (tiptap HTML).
 *
 * Vendor portal always writes plain text with mentions. Admin writes
 * tiptap HTML. Rule of thumb: if the body doesn't contain `<` that
 * isn't part of a mention token, it's plain text.
 */
export function looksLikePlainMentionBody(body: string): boolean {
  // Strip mention tokens, then look for HTML-like openers
  const stripped = body.replace(MENTION_RE, "")
  return !/<[a-z]/i.test(stripped)
}
