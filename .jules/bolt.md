## 2026-06-26 - Pre-computing Indexes over Iterators
**Learning:** This codebase heavily relies on in-memory `Map` collections in `lib/store.ts`. A common anti-pattern found is using `[...map.values()].find()` inside loops (e.g. iterating over one map and searching another). This causes an O(N^2) time complexity bottleneck.
**Action:** Always look for nested iterations across Maps. Replace them by pre-computing a reverse index (e.g., `const index = new Map(); store.collection.forEach(item => index.set(item.foreignKey, item))`) before the loop to achieve O(1) lookups.
