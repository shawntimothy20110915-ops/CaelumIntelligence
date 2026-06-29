## 2024-06-29 - O(N*M) spread in iteration
**Learning:** Found an O(N*M) inefficiency in `lib/store.ts` inside `buildLeaderboard` where `[...store.passports.values()].find(...)` was used inside a loop over `store.trustScores`. This forces a new array allocation and linear search over the entire `passports` map for every `trustScore`.
**Action:** Use a pre-computed map or direct loop for O(1) lookups in tight loops over the in-memory store.
