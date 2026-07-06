## 2024-07-06 - In-Memory Store Iterator Spread Anti-Pattern
**Learning:** Spreading iterators of large Maps (`[...store.passports.values()]`) inside loops (`forEach`, `.find`) causes severe O(N*M) performance bottlenecks in the in-memory Store architecture. Creating a new array out of a Map for every single lookup item is incredibly inefficient.
**Action:** When searching an in-memory Store collection by a non-primary key, always pre-compute an index (e.g., `new Map()`) outside the loop to achieve O(1) lookups instead of spreading and using `.find()`.
