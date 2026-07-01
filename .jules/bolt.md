## 2024-07-01 - [Avoid O(N^2) Map values array spread in loops]
**Learning:** Found a performance bottleneck where `[...store.passports.values()].find(...)` was used inside a loop over `store.trustScores`. This is an O(n^2) operation because `Map.values()` needs to be iterated and spread into an array for every iteration of the outer loop.
**Action:** When cross-referencing maps, pre-compute an index as a new `Map` for O(1) lookups instead of doing linear searches.
