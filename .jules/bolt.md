## 2024-03-24 - Pre-compute Map indexes in loops instead of `.values().find()`
**Learning:** In the `Store` architecture which uses in-memory `Map` collections, iterating through `store.trustScores` while doing `[...store.passports.values()].find(...)` causes an O(N^2) time complexity and massive array allocation on each loop iteration.
**Action:** When performing cross-references between Maps in loops, always pre-compute a lookup index (e.g. `passportsByAgentId = new Map(...)`) before the loop to achieve O(1) lookups and O(N) overall complexity.
