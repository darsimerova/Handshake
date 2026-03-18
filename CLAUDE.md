# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project is currently empty. Update this file once the project is initialized with build commands, architecture details, and development workflow.

## Mandatory Workflow Rules

- **ALWAYS** use `bun` and `bunx`. **NEVER** use `npm`, `yarn`, or `pnpm`.
- **NEVER** make code changes directly on the `main` branch.
  Always create a feature branch first: `git checkout -b feature/<name>`
- **ALWAYS** run the full CI check locally before committing:
  `bun install --frozen-lockfile && bunx tsc --noEmit && bun run lint && bun run test:run && bun run build`
- **ALWAYS** run `/team-review` and fix any issues before committing.
- **ALWAYS** create a PR. Then run `/greptile-review-loop` for automated review + fix.
- **NEVER** push code directly to `main`. All code goes through PRs.