## 2024-05-30 - O(N) Array Spread for Map Values
**Learning:** The codebase relies on `[...store.passports.values()].find(...)` and `Array.from(...)` which spreads the entire Map into a new array. For large data sets, this causes O(N) memory allocations and O(N) time complexity, becoming a severe bottleneck. The memory context mentions maintaining a journal to avoid such anti-patterns.
**Action:** Replace `Array.from().find` with a maintained `agentToPassportId` Map for O(1) lookups.
