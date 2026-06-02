export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\u4e00-\u9fa5\w]+/g) ?? [];
  return [...new Set(matches)];
}

export function dishDisplayTitle(dish: {
  title: string | null;
  content: string;
}): string {
  if (dish.title?.trim()) return dish.title.trim();
  const tags = extractHashtags(dish.content);
  if (tags[0]) return tags[0];
  const line = dish.content.split("\n")[0].trim();
  if (!line) return "未命名菜品";
  return line.length > 28 ? `${line.slice(0, 28)}…` : line;
}

export function dishCoverImage(imageUrls: string[]): string {
  return imageUrls[0] ?? "";
}
