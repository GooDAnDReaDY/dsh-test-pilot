# dsh-test-pilot 0.1.2 — backlog and release plan

## Target and scope

Deliver the owner-assigned open Gitea backlog as one branch, one PR, and one
public 0.1.2 release. Keep the existing package version; do not publish an
alternate candidate as a registry release before acceptance.

This release closes the 0.1.2 work block: autonomous in-turn test feedback,
transition-only notices, changed-file selection, per-workspace configuration
and runner detection, the settings/status surfaces, bounded persistent state,
the two-tool contract, the authenticated read-only status endpoint, Node.js
built-in test summary parsing, and package/documentation correctness.

Self-healing/repair turns remain explicitly disabled and out of scope. Test
generation, commit blocking, CI/CD, and later roadmap items remain deferred;
the plugin must not edit files, commit, push, or block approval.

## Issue map and proof

| Gitea issue | 0.1.2 completion evidence |
| --- | --- |
| #1 | Umbrella for the scoped 0.1.2 block; explicitly retain deferred roadmap items |
| #4 | `tools/post-execute` integration tests; in-turn bounded `additionalContexts` |
| #5 | Transition policy tests for green/red/recovery and repeated failures |
| #6 | Changed-file selector tests, including safe full-suite fallback |
| #7 | Workspace rule precedence, runner detection and config validation tests |
| #8 | Settings card, session chip, EN/ZH UI tests and visual evidence |
| #9 | Atomic persistence, retention, corruption and restart tests |
| #10 | Host composition proves exactly two tools |
| #11 | Session-bound, authenticated, allowlisted read-only route tests |
| #13 | Native Node.js test summary fixtures for counts, duration and red status |
| #19 | Production package dependency resolves to immutable registry version |
| #20 | `npm pack` contains all public READMEs and linked verification image |

## Execution order

1. Keep the existing feature implementation and tests for #4–#11; do not reopen
   self-healing or expand the product past the release target.
2. Add the Node.js parser regression test first, then implement summary parsing
   through the existing npm adapter without a new runner API.
3. Include `media/` in the npm allowlist; verify all README links and inspect
   the actual packed file list.

## Acceptance status (2026-09-23)

- Implemented in this release branch: Node.js built-in runner summary parsing
  (#13) and packaging the README-linked visual verification image (#20).
- Verification: `npm test` 84/84; preflight 0 FAIL and 7 WARN; exact 0.1.2
  tarball installed on the isolated MiniPC profile, plugin/component loaded,
  unauthenticated status route rejected requests, then only this candidate and
  its tarball were removed. Test service remained active and pre-existing
  plugins were preserved.
- Existing Gitea evidence covers earlier composition, API and settings-card
  checks, including light/dark card appearance. The 0.1.2 candidate's live
  session-header chip has not been E2E tested because MiniPC has no test API key.
  On 2026-09-23 the owner accepted this as an unverified release limitation;
  production credentials must not be copied to close this gap. This acceptance
  is not merge or publication approval.
- Preflight warnings were manually reviewed; packaged file list and common-secret scan are clean. Remaining: commit/push,
  one PR, explicit owner approval before merge, publish public 0.1.2, install
  the exact registry artifact in production and verify it, update the public
  showcase through its own Gitea workflow, then close all 12 issues with evidence.
- Self-healing, test generation, commit blocking, CI/CD and later roadmap work
  remain out of scope; the umbrella issue is only closed for the 0.1.2 block.
