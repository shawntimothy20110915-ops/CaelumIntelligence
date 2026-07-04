## 2026-05-30 - O(1) Map Lookups for Passport by AgentId
**Learning:** Using `[...store.passports.values()].find(p => p.agentId === ...)` traverses the entire collection, which performs poorly as `passports` scales. Building a secondary Map index for these types of regular queries is much faster.
**Action:** Always maintain dedicated `Map` indexes (like `agentToPassportId`) to achieve O(1) performance instead of spreading iterators and finding matching entries sequentially.
