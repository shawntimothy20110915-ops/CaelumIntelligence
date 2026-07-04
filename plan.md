1. **Add `agentToPassportId` index map to `Store`**
   - In `lib/store.ts`, update `Store` interface to include `agentToPassportId: Map<string, string>`.
   - Update `initStore` and `seedStore` to initialize and populate this map.
2. **Create `getPassportByAgentId` helper function**
   - Add this function to `lib/store.ts` to lookup passport by `agentId` using the new index in `O(1)` time.
   - Include a fallback check (`store.agentToPassportId.size !== store.passports.size`) to lazily rebuild the index if it goes out of sync (e.g. after DB restore from older snapshots).
3. **Update API routes and store methods to use the index**
   - Refactor `[...store.passports.values()].find()` in `app/api/embed/route.ts`, `app/api/attest-chain/route.ts`, `app/api/trust-score/route.ts`, and `lib/store.ts`.
   - Also update `app/api/passport/mint/route.ts` to set the `agentId` index when a new passport is minted.
4. **Complete pre-commit steps**
   - Ensure proper testing, verification, review, and reflection are done (e.g., `npm run lint`, test execution).
5. **Create Journal Entry**
   - Add a journal entry in `.jules/bolt.md` documenting this optimization.
6. **Submit PR**
   - Create PR with title "⚡ Bolt: [performance improvement]" containing What, Why, Impact, and Measurement details.
