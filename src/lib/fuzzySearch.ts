export interface FuzzyResult<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): FuzzyResult<T>[] {
  if (!query) return items.map((item) => ({ item, score: 0 }));

  const lowerQuery = query.toLowerCase();
  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const text = getText(item).toLowerCase();
    let score = 0;
    let queryIdx = 0;

    for (let i = 0; i < text.length && queryIdx < lowerQuery.length; i++) {
      if (text[i] === lowerQuery[queryIdx]) {
        score += 1;
        if (queryIdx > 0 && i > 0 && text[i - 1] === lowerQuery[queryIdx - 1]) score += 2;
        if (i === 0) score += 3;
        queryIdx++;
      }
    }

    if (queryIdx === lowerQuery.length) {
      results.push({ item, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
