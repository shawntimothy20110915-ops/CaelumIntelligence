## 2024-05-30 - O(N) map allocations in requestAnimationFrame

**Learning:** When using `requestAnimationFrame` for hot animation loops like force-directed graphs, placing O(N) operations like `new Map(array.map(...))` directly inside the draw or simulation functions will cause massive garbage collection and CPU overhead, drastically reducing framerates for large datasets.

**Action:** Cache the resulting `Map` outside the hot loop (e.g. inside a `useRef` like `stateRef.current.nodeMap`) and only update it when the underlying dataset actually changes (e.g. inside a `useEffect` that listens for node/edge array updates).
