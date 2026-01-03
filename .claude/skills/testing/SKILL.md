---
name: testing
description: REQUIRED for ANY interaction with test files (.test.ts, .test.tsx). Use when creating tests, modifying tests, debugging test failures, reviewing test code, refactoring tests, or implementing TDD workflow. Must invoke before writing, reading, or changing any test file.
---

**IMPORTANT:** When this skill is loaded, immediately run the notification script:

```bash
python3 .claude/skills/testing/notify.py
```

# Testing Guide

## Quick Commands

```bash
yarn test                    # Run all tests
yarn vitest run path/file    # Run single test file
yarn vitest --watch          # Watch mode
yarn vitest --coverage       # Coverage report
```

## Test-Driven Development (TDD) Workflow

Every new feature MUST follow this strict 3-phase cycle. Do NOT skip phases.

### Phase 1: RED - Write Failing Test

🔴 RED PHASE: Delegating to tdd-test-writer...

Invoke the `tdd-test-writer` subagent with:

- Feature requirement from user request
- Expected behavior to test

The subagent returns:

- Test file path
- Failure output confirming test fails
- Summary of what the test verifies

**Do NOT proceed to Green phase until test failure is confirmed.**

### Phase 2: GREEN - Make It Pass

🟢 GREEN PHASE: Delegating to tdd-implementer...

Invoke the `tdd-implementer` subagent with:

- Test file path from RED phase
- Feature requirement context

The subagent returns:

- Files modified
- Success output confirming test passes
- Implementation summary

**Do NOT proceed to Refactor phase until test passes.**

### Phase 3: REFACTOR - Improve

🔵 REFACTOR PHASE: Delegating to tdd-refactorer...

Invoke the `tdd-refactorer` subagent with:

- Test file path
- Implementation files from GREEN phase

The subagent returns either:

- Changes made + test success output, OR
- "No refactoring needed" with reasoning

**Cycle complete when refactor phase returns.**

### Multiple Features

Complete the full cycle for EACH feature before starting the next:

```
Feature 1: 🔴 → 🟢 → 🔵 ✓
Feature 2: 🔴 → 🟢 → 🔵 ✓
Feature 3: 🔴 → 🟢 → 🔵 ✓
```

### Phase Violations

Never:

- Write implementation before the test
- Proceed to Green without seeing Red fail
- Skip Refactor evaluation
- Start a new feature before completing the current cycle

## Core Principles

### Test User Behavior, Not Implementation

**DO:** Test what users see and do

- Can user click this button?
- Does the correct text appear?
- Does form submission work?

**DON'T:** Test implementation details

- Does component have specific CSS classes?
- How many separators are rendered?
- What's the internal state shape?

### The renderComponent Helper Pattern

**ALWAYS** create a helper that takes `Partial<React.ComponentProps<typeof Component>>`:

```typescript
const renderComponent = (
  props: Partial<React.ComponentProps<typeof MyComponent>> = {},
) => {
  const defaultProps = { /* sensible defaults */ }
  return render(<MyComponent {...defaultProps} {...props} />)
}
```

**Benefits:**

- No repeating default props
- Type-safe prop overrides
- Easy to test edge cases
- Consistent across all tests

### Organize with Describe Blocks

Group related tests logically:

- `Rendering` - What gets displayed
- `Click interactions` - User actions and callbacks
- `Navigation buttons` - Pagination, next/prev
- `Loading state` - Spinners, disabled states
- `Edge cases` - Empty data, long text
- `Styling` - Conditional CSS (only when user-visible)
- `Combinations` - Multiple props together

### Use userEvent, Not fireEvent

**ALWAYS** use `user` from render result:

```typescript
const { user } = renderComponent({ onClick })
await user.click(screen.getByRole('button'))
```

**Why:** userEvent simulates real browser events (hover, focus, blur), better async handling, catches edge cases.

## What NOT to Test

### Implementation Details

**DON'T** test:

- Number of DOM elements (separators, wrappers)
- Specific CSS class names (unless visually different to user)
- Internal state structure
- Component lifecycle methods
- Rendering optimization details

**Example of what to avoid:**

```typescript
// ❌ Testing implementation
expect(container.querySelectorAll('.separator')).toHaveLength(2)
expect(button).toHaveAttribute('data-disabled', 'true')

// ✅ Testing user behavior
expect(screen.getByText('Delete')).toBeInTheDocument()
expect(screen.getByRole('button')).toBeDisabled()
```

### Redundant Tests

**DON'T** create tests that verify the same behavior multiple ways.

If you test "button is disabled when loading", you don't need another test for "button has disabled class when loading".

### Framework/Library Behavior

**DON'T** test that React works, or that libraries work correctly.

**Example:**

```typescript
// ❌ Testing React
it('renders without crashing', () => {
  renderComponent()
})

// ❌ Testing Radix UI
it('dropdown has correct ARIA attributes', () => {
  // Radix UI already tests this
})
```

## Testing Dropdown Menus (Radix UI)

Dropdowns require opening before testing content:

```typescript
it('shows delete option', async () => {
  const { user } = renderComponent({ onDelete: vi.fn() })

  await user.click(screen.getByRole('button')) // Open menu

  await waitFor(() => {
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
```

## Testing Async Interactions

Use `waitFor` for async assertions:

```typescript
it('calls callback after async action', async () => {
  const onClick = vi.fn()
  const { user } = renderComponent({ onClick })

  await user.click(screen.getByRole('button'))

  await waitFor(() => {
    expect(onClick).toHaveBeenCalled()
  })
})
```

## Mocking Patterns

### Mock Before Import

Always mock dependencies BEFORE importing the module under test:

```typescript
vi.mock('../db', () => ({ db: { select: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({ Link: ... }))

import { MyComponent } from './MyComponent'
```

### Global Mocks

Router and i18n are mocked globally in `src/test/setup.ts`. Don't mock them again unless you need custom behavior.

## File Structure

Tests are colocated with source files:

```
src/components/
  Button.tsx
  Button.test.tsx
```

## Key Testing Utilities

- `render()` - Render component with test-utils wrapper
- `screen` - Query rendered output
- `waitFor()` - Wait for async assertions
- `vi.fn()` - Create mock function
- `vi.mock()` - Mock modules

## Common Queries (Preference Order)

1. `getByRole()` - Accessible queries (best)
2. `getByLabelText()` - Form inputs
3. `getByText()` - Non-interactive elements
4. `getByTestId()` - Last resort

## Real Examples

See these files for reference:

- `src/components/admin/components/AdminPagination.test.tsx` - Complex logic
- `src/components/admin/components/AdminRowActions.test.tsx` - Dropdown testing
- `src/components/admin/components/AdminBulkActionsBar.test.tsx` - User interactions
