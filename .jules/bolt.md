## 2026-06-27 - Pre-computing Map Indexes vs Iterating
**Learning:** The application heavily relies on an in-memory `Store` object using Maps. Some data access patterns incorrectly convert map values into arrays to use `.find()`, resulting in O(N*M) complexity and frequent GC thrashing during tight loops (like building leaderboards).
**Action:** Always refactor `[...store.collection.values()].find()` into pre-computed `Map` indexes for O(1) lookups when executed within a loop. Ensure we measure O(N) versus O(N*M) improvements.
