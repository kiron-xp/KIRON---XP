# Security Specification — KIRON - XP Shared Live Vault

## Data Invariants
1. All document IDs across `accounts`, `emails`, `notes`, `sheets`, and `recoveryCodes` must match `^[a-zA-Z0-9_\\-]+$` and stay within 128 characters.
2. Every document write must satisfy strict `keys().hasAll(...)` and `keys().hasOnly(...)` schema validation, explicit type checks, and strict string/number/map size limits to prevent shadow fields and oversized payload abuse.
3. On updates, `id` and `createdAt` must remain immutable (`incoming().id == existing().id` and `incoming().createdAt == existing().createdAt`).
4. Sheet rows are stored as a native Firestore map (`rowsMap`) of row index strings to cell string arrays (`rowCount <= 500`, `colCount <= 50`) without nested arrays.

## Dirty Dozen Payloads (Rejected by Rules)
1. Shadow field injection on `/accounts/{id}` (`isAdmin: true`)
2. Oversized `issuer` (> 120 chars) on `/accounts/{id}`
3. Invalid OTP `type` (`"sms"`) on `/accounts/{id}`
4. Invalid OTP `digits` (`7`) on `/accounts/{id}`
5. Invalid document ID (`../bad` or >128 chars) on `/emails/{id}`
6. Oversized `avatarDataUrl` (> 200,000 chars) on `/emails/{id}`
7. Missing required `email` field on `/emails/{id}`
8. Invalid note color (`"neon"`) on `/notes/{id}`
9. Oversized note `content` (> 20,000 chars) on `/notes/{id}`
10. Mutating immutable `createdAt` during update on `/notes/{id}`
11. Out-of-bounds `rowCount` (> 500) on `/sheets/{id}`
12. Wrong type for `used` (`"yes"` string instead of boolean) on `/recoveryCodes/{id}`
