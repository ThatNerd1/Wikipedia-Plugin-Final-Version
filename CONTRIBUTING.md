# Mitwirken

## Setup

```bash
npm ci
npm run typecheck && npm run lint && npm run test:all
```

## Grundregeln

- TypeScript `strict`. Kein `any` ohne Begründung.
- Kein `eval`, kein `Function`, kein Remote-Code, keine Inline-Scripts.
- Nicht vertrauenswürdige Eingaben (Selektion, API-HTML, Import, Nachrichten) immer
  validieren/sanitisieren. Der einzige erlaubte `innerHTML`-Sink ist `setSanitizedHtml`.
- Neue Nachrichtentypen brauchen einen Schema-Zweig in `validateMessage` + Test.
- Neue Sprachen nur über die Allowlist in `src/core/security/languages.ts`.

## Vor jedem PR

- `npm run typecheck`, `npm run lint`, `npm run test:all` müssen grün sein.
- Bei sicherheitsrelevanten Änderungen: Security-Tests ergänzen.
- Änderungen an Berechtigungen im PR begründen.

## Sicherheitslücken melden

Bitte **nicht** öffentlich als Issue, sondern als GitHub Security Advisory (privat)
bzw. an die im Repository genannte Kontaktadresse. Keine Secrets in Commits.

## Commit-/Branch-Konventionen

- Feature-Branches von `main`.
- Aussagekräftige, kleine Commits.
- CI (`.github/workflows/ci.yml`) muss durchlaufen.
