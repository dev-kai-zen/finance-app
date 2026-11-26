# Feature audit checklist

Applies to new audits and reopened reviews. Added November 26, 2026 (Asia/Manila), using the v1.8.0 feature audits and AGENTS.md Sections 17–20. This supplements all existing requirements; it does not replace financial, architecture, offline, recovery, localization, privacy, or performance checks.

## Workflow and evidence

1. **Audit:** Record date, commit, working-tree state, scope, contracts, independent fixtures, ownership, actions, cross-feature consumers, database relationships, findings, and performance impact.
2. **Validate:** Exercise actual production services/callbacks against migrated in-memory SQLite where appropriate. Separate executed failures, source-confirmed paths, layout risks awaiting device confirmation, policy questions, and accepted deferrals.
3. **Review:** Settle findings and product decisions before remediation. Record each decision and any accepted limitations.
4. **Remediate:** Answer all four AGENTS.md Section 20 questions for each production change; keep the fix surgical, respect public services, preserve atomicity, and add meaningful regressions.
5. **Sign off:** Verify the final candidate, relevant consumers, typecheck, native behavior, localization/accessibility, and performance. Record incomplete checks explicitly. Passing TypeScript or source-shape tests does not establish native rendering or frame rate.

For a documentation-only audit, production changes, release notes, version bumps, and commits are not implied. For implemented changes, follow AGENTS.md release-note and version-decision requirements.

## Existing audit requirements

- [ ] Map all entry points, screen actions, filters, modals, exports, background processors, and shared consumers.
- [ ] Trace route → screen → hook → service/repository → SQLite; verify module boundaries and mutation ownership.
- [ ] Reconcile amounts, currencies, dates, refunds, transfers/fees, splits, opening balances, and history using independent expected results.
- [ ] Check validation, repeated taps/retries, transaction rollback, delete/archive/restore, database replacement, offline behavior, and background sync.
- [ ] Exercise loading, content, empty, error/retry, dirty drafts, pending actions, and keyboard/back/dismiss behavior.
- [ ] Check privacy in visual and accessibility output, premium/workspace rules, and English/Filipino/Spanish parity.
- [ ] State synchronous query counts, returned row bounds, complexity, query plans, deferred cancellation, context/row re-renders, and closed/offscreen gating.
- [ ] Measure native release-build navigation, gestures, scrolling, and background/resume work against 60–120fps (8.3–16.6ms frame budgets); distinguish host probes from device measurements.
- [ ] Run relevant regression suites and `npx tsc --noEmit`; state what was not executed.

## New required check: text collision, containment, and reflow

**Acceptance rule:** Text must stay within its card, row, field, badge, button, or modal content area. It must not paint over neighboring text, icons, controls, separators, or adjacent cards. Containers must accommodate supported content and system text sizes. Simply hiding overflow does not pass if essential content or actions disappear.

### Test matrix

- [ ] Check 320, 360, and 390 logical-pixel portrait widths, the smallest supported device, landscape, and tablet/split-window layouts where supported. Record actual available content width and insets.
- [ ] Check normal, roughly 130%, 150%, and 200% system font scale where supported, plus larger display size. Record actual settings; keep readable system text scaling enabled.
- [ ] Check English, Filipino, and Spanish with the same data; include the longest localized labels, status badges, plural counts, and formatted dates.
- [ ] Use valid long names up to each field's limit: account/pocket/type, category/subcategory, schedule, transaction, subscription, label, and imported/file names. Include long unbroken text, emoji, accented characters, and explicit line breaks where allowed.
- [ ] Use zero, negative, and large valid monetary values such as `999,999,999.99`, long currency formatting, 0/2/3-decimal currencies, signs, percentages, and privacy masks. Do not create invalid records just to stretch the UI.
- [ ] Exercise every distinct layout state: expanded/collapsed, compact/detailed, due/failed, paused/archived, exceeded/rollover, selected/disabled/pending, validation/error, empty/loading, and premium badges where applicable.
- [ ] Check modals/forms with keyboard open and closed, long selected account/category values, error messages, nested pickers, and primary/close actions.

### Inspect each surface

- [ ] **Card headers:** Long title + status/count badge + amount + icons fit together or reflow. A one-line title alone does not bound its siblings.
- [ ] **Metadata:** Account/pocket/category names, dates, currency rates, and tags wrap within available width without crossing amount columns.
- [ ] **Summary grids:** Each amount and label stays within its own column; long values do not invade adjacent cells. Verify ribbons and nested cards too.
- [ ] **Actions:** All translated action labels and icons remain visible and operable; rows reflow when needed and touch areas remain usable and non-overlapping.
- [ ] **Height:** Wrapped text grows the container. Check fixed heights, explicit line heights, absolute positioning, and bottom content for clipping or intrusion into the next row.
- [ ] **Truncation:** Ellipsis is acceptable for secondary names only when the full value is accessible through a clear detail/edit path. Essential amounts, errors, and actions need a readable full-value path; silently cutting off digits is a failure.
- [ ] **Containment vs concealment:** Inspect both text-to-text collision and content clipped by `overflow: hidden`. A rounded border concealing the problem is not a fix.
- [ ] **Accessibility:** Screen reader labels describe the displayed state without exposing masked amounts. Large-text reflow must preserve navigation and at least 44×44 effective action targets.

### Evidence and sign-off record

For every suspected or confirmed issue, record:

| Field | Required detail |
| --- | --- |
| Identity | Stable finding ID, owning feature, source file/component and current commit. |
| Reproduction | Navigation steps, valid data, language, device/OS, logical width, font/display scale, and relevant UI state. |
| Evidence level | **Source risk / needs native validation**, **native reproduced**, **verified fixed**, or **accepted limitation**. |
| Expected vs actual | Exact content that should fit and what overlaps, clips, becomes unreadable, or loses its action. |
| Visual proof | Screenshot of the whole card and surrounding content; before/after on the same settings for a fix. |
| Regression | Retest affected states and consumers. Automated layout assertions are useful support, but mocked JSX/style tests alone cannot prove native glyph geometry. |
| Performance | Assess additional layout passes, mounted rows, JS work, and query/render changes. Prefer native flex/wrapping/min-height over per-keystroke measurement or global font changes. |

Do not mark this checklist complete solely from a grep for `flexShrink`, `numberOfLines`, or `overflow`. Inspect the rendered result. Do not reopen resolved financial findings merely because this new visual criterion is pending; add a separately scoped layout status to the original report.

Current follow-up: [v1.8.0 manual layout review](v1.8.0/text-layout-review-v1.8.0.md).
