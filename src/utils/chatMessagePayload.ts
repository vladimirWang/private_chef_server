/** 从 LangChain message_to_dict 存的 JSONB payload 提取正文 */
export function payloadContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  return typeof content === "string" ? content.trim() : "";
}

/** human → user，ai → assistant */
export function payloadRole(payload: unknown): "user" | "assistant" | "system" {
  const type = (payload as { type?: string })?.type;
  if (type === "human") return "user";
  if (type === "ai") return "assistant";
  if (type === "system") return "system";
  return "assistant";
}

export function sessionTitleFromContent(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "新对话";
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}
