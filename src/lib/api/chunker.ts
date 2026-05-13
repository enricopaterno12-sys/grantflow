export function splitIntoChunks(text: string, maxLen = 8000): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    const breakAt = text.lastIndexOf("\n\n", end);
    if (breakAt > start + maxLen * 0.5) {
      end = breakAt;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
