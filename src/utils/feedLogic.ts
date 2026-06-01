// src/utils/feedLogic.ts

export const getSmartFeed = <T extends { created_at: string; user_id?: string; provider_id?: string }>(
  items: T[], 
  maxPerUser = 2
): T[] => {
  if (!items || items.length === 0) return [];

  const userCount: Record<string, number> = {};
  const now = Date.now();

  // 1. Recency Scoring
  const scored = items.map(item => {
    const postedDate = new Date(item.created_at).getTime();
    const hoursSincePosted = (now - postedDate) / (1000 * 60 * 60);
    
    // Smooth decay: newer items stay closer to 1.0
    const decayScore = (1 / (1 + hoursSincePosted)) + (Math.random() * 0.01);
    return { ...item, _score: decayScore };
  });

  // Sort: highest score (newest) first
  scored.sort((a, b) => b._score - a._score);

  const topFeed: T[] = [];
  const overflowFeed: T[] = [];

  // 2. Diversification
  for (const item of scored) {
    // Check for either user_id or provider_id (handling different table schemas)
    const userId = item.user_id || item.provider_id || "unknown";
    const currentCount = userCount[userId] || 0;

    if (currentCount < maxPerUser) {
      topFeed.push(item as T);
      userCount[userId] = currentCount + 1;
    } else {
      overflowFeed.push(item as T);
    }
  }

  return [...topFeed, ...overflowFeed];
};