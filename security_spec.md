# Security Specification & Test Matrix

## 1. Data Invariants
1. **Catalog Integrity**: Every catalog document must have a valid `id`, valid `business` object (with non-empty `name` and `whatsapp`), and an array of `products`.
2. **Product Boundaries**: Products must have valid names, numeric prices >= 0, and non-empty image URLs.
3. **Seller Access**: Seller accounts can only be modified by the authenticated seller matching `sellerId` or `request.auth.uid`.
4. **Public Readability**: Catalogs are publicly readable by customers via direct document lookup (`/catalogs/{catalogId}`).
5. **No Blind Shadow Updates**: Updates cannot inject malicious fields, override createdAt, or bypass schema keys.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Ghost Field Injection**: Attempt to write `{ isSuperAdmin: true }` into `/catalogs/{id}`.
2. **Gigabyte String Attack**: Attempt to pass a 2MB string in the `name` or `description` field.
3. **Price Manipulation**: Negative price `{ price: -50 }`.
4. **Invalid Catalog ID**: Passing characters outside `[a-zA-Z0-9_-]` (e.g. `../../root`).
5. **Orphan Seller Write**: Unauthenticated creation of a seller profile without matching credentials.
6. **Immutable Field Tampering**: Attempting to alter `createdAt` on an existing document during update.
7. **Array Overflow**: Appending 500,000 mock items to the products array.
8. **PII Exfiltration Query**: Blanket read / list on `/sellers` without individual document ID.
9. **Identity Spoofing**: Setting `sellerId` to another user's UID on catalog update.
10. **Null WhatsApp Field**: Business payload missing the required `whatsapp` field.
11. **Type Mismatch**: Sending `price: "free"` as a string instead of a number.
12. **Malicious Regex Bypass**: Injecting SQL / script strings in document keys.
