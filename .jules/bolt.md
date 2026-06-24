
## 2024-05-30 - O(N*M) array finds block main thread
**Learning:** Nested array operations like `Array.from(map.values()).find()` inside `.forEach()` scale terribly as data grows (O(N*M)), freezing the event loop during periodic tasks like leaderboard updates.
**Action:** Always pre-compute a lookup `Map` (O(N)) before iterating to achieve O(1) lookups inside the loop (total complexity O(N+M)).
