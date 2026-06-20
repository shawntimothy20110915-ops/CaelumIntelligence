## 2026-06-20 - [Memoize expensive Array iterations in Dashboard]
**Learning:** Found O(N*M) nested array iterations inside render functions in the dashboard component. Mapping over lists to search or filter elements inside map elements creates unnecessary performance bottlenecks during React re-renders.
**Action:** Replace nested loops like `.some()` and `.filter()` within `.map()` array rendering, with O(1) hash map/set lookups memoized using `useMemo`. E.g., Use a pre-computed `Map` or `Set` outside the `.map()` to cache values and achieve O(N + M) performance.
