---
trigger: model_decision
description: Enforce phased Subagent-Driven Development (SDD), dual-agent verification, and safety guardrails on all multi-step coding tasks.
---

# Subagent-Driven Development & Safety Guardrails

When planning or executing any multi-step feature, database migration, performance optimization, or architectural refactor in this codebase:

## 1. Strict Safety Invariants
1. **Zero Remote Push Policy:** NEVER run `git push` autonomously. Remote repository updates require explicit human action.
2. **Stop Before Merge Policy:** All feature work must remain on a dedicated feature branch (e.g. `feat/*`). NEVER merge into `main` or `master` autonomously. Stop before the merge and let the human merge when ready.
3. **Database Test Isolation:** All automated tests must run strictly against isolated test databases (`DATABASE_URL_TEST`) with explicit confirmation flags (e.g., `TEST_DB_CONFIRM="yes-reset-this-db"`). NEVER execute tests, drops, or resets against the development or production database.
4. **Environment Resilience on Windows:**
   - Always prefer IPv4 DNS resolution for cloud database poolers (e.g., Neon AWS) on Windows by setting `dns.setDefaultResultOrder('ipv4first')`.
   - Properly escape PowerShell commands and file paths.

## 2. Dual-Subagent Protocol (Task by Task)
For every task in an implementation plan:
1. **Task Brief (`docs/plans/sdd/task-X-brief.md`):** Author a concise brief with the base commit, exact file scope, steps, and acceptance criteria before implementation starts.
2. **Implementer Subagent:** Dispatch a dedicated subagent (`Role: "T<X> Implementer"`). The implementer:
   - Implements code and unit/integration tests strictly within task scope.
   - Verifies tests pass locally.
   - Commits changes to the feature branch with message `T<X>: <Task Title>`.
   - Generates a review package diff: `git diff <base-commit>..HEAD > docs/plans/sdd/task-X-review-package.diff`.
   - Writes an implementation report: `docs/plans/sdd/task-X-report.md`.
3. **Independent Task Reviewer Subagent:** Dispatch an independent reviewer (`Role: "T<X> Task Reviewer"`). The reviewer:
   - Reviews the diff against the specification and Fowler code smell baseline.
   - Independently re-executes test suites against the test database.
   - Delivers a structured report with an explicit verdict: `APPROVED` or `CHANGES REQUESTED`.
4. **Persistent Ledger Update:** Upon approval, update the master execution log (`EXECUTION_LOG.md`) and commit the ledger update before advancing to the next task.

## 3. Continuous Execution & Stop Conditions
- Run continuously task-by-task without pausing for unnecessary check-ins.
- **Stop and ask ONLY for:**
  - Irreversible data deletion.
  - Missing original files or assets requiring human input.
  - Reaching the final task before merge.
