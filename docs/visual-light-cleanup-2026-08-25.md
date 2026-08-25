# Loadify Market — light compatibility cleanup

Date: 25 August 2026

Scope:
- remove legacy dark page/account/mobile/auth surfaces through a compatibility layer;
- preserve the current footer exactly as-is;
- retain brand-colour buttons/badges and avoid a global `text-white` rewrite;
- preserve functional behaviour.

Branch guard:
- base: `5be0d112eb8b7d531f3881699f605d18844c1837`;
- footer component is not modified;
- only `src/light-compat.css`, its load in `src/main.tsx`, this guard note and a focused guard test are introduced.

Acceptance requires build/test/preview verification before merge.
