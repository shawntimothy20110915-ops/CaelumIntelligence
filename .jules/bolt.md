## 2026-07-08 - [O(n^2) map value spreading]
**Learning:** Spread map values `[...map.values()]` inside a loop leads to O(n^2) performance.
**Action:** Precompute an index map before iterating to achieve O(1) lookups.
