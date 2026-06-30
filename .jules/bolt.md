## 2024-05-30 - O(N²) Arrays Spread in Loops
**Learning:** Found a common pattern in the codebase where Maps are spread into arrays (`[...store.passports.values()]`) inside loops. For example, in `buildLeaderboard` over `store.trustScores`, causing an O(N²) time complexity.
**Action:** Replace `[...store.values()].find()` inside loops with O(1) Map lookups by precomputing an index mapping `agentId` to `passport` prior to the loop.
