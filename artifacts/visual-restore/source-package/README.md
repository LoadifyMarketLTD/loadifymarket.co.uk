# Loadify Visual Restore — Original Source Package

This directory is reserved for provenance metadata for the original visual restore package used by the `visual-restore/user-source-20260823` workstream.

## Preferred handling

Do not make the application depend on a ZIP file at runtime.

Runtime assets belong in:

- `public/category-visuals/wholesale/`
- `public/category-visuals/subcategories/<category-slug>/`

## If the original ZIP is archived here

Use a stable filename such as:

`loadify-visual-restore-original-2026-08-23.zip`

Before committing it, record its SHA-256 checksum in `SHA256SUMS.txt`.

Large ZIP files should not be committed to ordinary Git history unless the owner explicitly accepts repository growth or Git LFS has been configured. The metadata/checksum may remain here even when the ZIP itself is stored externally.

## Provenance fields to record

- original filename
- date received
- source / who supplied it
- SHA-256 checksum
- approximate size
- short description of contents
- whether the package is immutable source evidence or generated output

## Safety

This source package is visual-only. It must not contain credentials, environment files, Supabase keys, Stripe secrets, private customer data, or production exports.
