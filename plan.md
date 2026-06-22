1. **Identify Performance Opportunity**: The `app/dashboard/page.tsx` file defines `filteredPassports`, `activeCount`, `roots`, and `orphanLinks` using array `.filter()` inside the render function of the `Dashboard` component. These are recalculated on every re-render (which happens frequently due to typing in inputs or other state changes).
2. **Implementation**: Add `useMemo` from React to memoize `filteredPassports`, `activeCount`, `chainCount`, `roots`, and `orphanLinks`. We need to import `useMemo`.
3. **Refactor**: Update `app/dashboard/page.tsx` with the optimized code.
4. **Pre-commit Checks**: Run `npm run lint` and `npm run build` as requested by memory boundaries.
5. **Create PR**: Commit changes with Bolt format.
