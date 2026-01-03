# CLAUDE.md Design Document

**Date:** 2026-01-03
**Status:** Implemented
**Purpose:** Guide for optimizing Claude Code's understanding of the FineNail e-commerce platform

---

## Executive Summary

Created comprehensive CLAUDE.md file to serve as Claude Code's "onboarding manual" - providing quick context loading, preventing pattern violations, and guiding tool usage. The document addresses three main friction points: forgetting project conventions, missing context about custom utilities, and breaking existing patterns.

## Goals

1. **Quick Context Loading** - Help Claude understand the project in seconds, not minutes
2. **Prevent Pattern Violations** - Stop Claude from breaking established conventions
3. **Guide Tool Usage** - Direct Claude to use the right skills and utilities
4. **Reduce Friction** - Eliminate common mistakes (wrong imports, reimplementing utilities, using API routes instead of server functions)

## Document Structure

Total length: ~800 words (short enough to load every session, comprehensive enough to prevent most issues)

### 1. Project Identity (3-4 lines)
Quick overview of what the project is and core technologies.

### 2. Critical Rules (~150 words)
Non-negotiable conventions that get violated most often:
- Component patterns (FNForm, test-utils imports, shadcn UI)
- Import organization (test patterns, server function imports, path aliases)
- Server functions pattern (middleware usage, error handling)
- API routes (limited to auth only)
- File organization (colocation, server logic separation)

### 3. Skills Quick Reference (~100 words)
When to use which skill:
- **Mandatory**: testing (for any test file work)
- **Architectural**: codebase-guide, typescript-lsp
- **Feature Development**: forms, admin-crud, database, i18n, checkout, design-system
- **Support**: debugging, security, api-routes

### 4. Key Utilities (~200 words)
Reusable functions that must not be reimplemented:
- Formatting (formatCurrency, formatDate)
- Class names (cn)
- API helpers (successResponse, errorResponse, requireAuth, requireAdmin)
- Server middleware (authMiddleware, adminMiddleware, error throwers)
- Session management
- Database access
- Other critical utilities (auth, CSRF, rate limiting, i18n, payments, images, email)

### 5. Architecture Principles (~150 words)
Why certain patterns exist:
- Server functions over API routes (type safety, DX)
- Middleware pattern (type safety, reusability)
- Top-level imports (performance, preventing runtime issues)
- FNForm standardization (consistency)
- Test colocation (maintainability)
- i18n database pattern (performance, flexibility)
- State management split (right tool for each job)
- Security layers (defense in depth)
- Performance patterns

### 6. File Organization (~100 words)
Where things go:
- Component directory structure
- Server function organization
- Route structure
- Utilities location
- Test colocation
- Naming conventions
- When to create new files
- Import path rules

### 7. Development Workflow (~100 words)
Essential commands and workflows:
- Development commands
- Git workflow
- Testing requirements
- Database changes
- Adding translations
- Common workflows (admin features, schema changes, bug fixes, forms)
- Pre-deployment checklist
- Performance checks
- When stuck

## Key Principles

### Emphasis on Server Functions
- Primary pattern for all data operations
- Middleware provides type-safe authentication
- API routes reserved exclusively for authentication flows
- Clear examples of correct patterns vs anti-patterns

### Test Pattern Enforcement
- References testing-patterns-guide.md
- Prevents common mistakes (import order, global mock duplication)
- Mandatory testing skill usage for test files

### Utility Discovery
- Comprehensive list of existing utilities
- Clear rule: check before creating
- Prevents reimplementation and inconsistency

### Skills Integration
- Clear guidance on when each skill applies
- "1% chance = use it" rule to prevent rationalization
- Skill categories for easy discovery

## Design Decisions

### Length Constraint
Kept to ~800 words to ensure:
- Fast loading every session
- Actually gets read (vs. being too long)
- Focuses on highest-impact information

### Structure Priority
Ordered by:
1. Most critical (rules that prevent breaking changes)
2. Tool guidance (skills and utilities)
3. Understanding (architecture principles)
4. Organization (file structure)
5. Workflow (development processes)

### Example-Driven
- Includes code examples for server functions
- Shows correct vs incorrect patterns
- Provides concrete workflows

## Success Metrics

### Expected Improvements
- **Reduced pattern violations**: Fewer instances of wrong imports, API routes for data ops
- **Less reimplementation**: Utilities get reused instead of recreated
- **Better skill usage**: Appropriate skills invoked proactively
- **Faster onboarding**: New sessions understand project context immediately

### Areas of Impact
1. **Component development**: Always uses FNForm, correct imports
2. **Server functions**: Uses middleware correctly, top-level imports
3. **Testing**: Follows patterns, uses testing skill
4. **Utilities**: Discovers and reuses existing code
5. **Architecture**: Understands why patterns exist

## Implementation Notes

### Maintenance
- Update when new patterns emerge
- Keep focused on highest-friction items
- Review and prune if grows beyond ~1000 words

### Complementary Documentation
- Works alongside existing docs:
  - `docs/testing-patterns-guide.md` - Detailed test patterns
  - `.claude/skills/codebase-guide/` - Architecture deep dive
  - `.claude/skills/` - Domain-specific guidance

### Evolution
File should evolve as:
- New patterns stabilize
- Common mistakes emerge
- Architecture changes
- New utilities are created

## Conclusion

CLAUDE.md provides a focused, actionable reference that addresses the three main friction points:
1. Forgetting conventions (Critical Rules section)
2. Missing context (Key Utilities, Skills sections)
3. Breaking patterns (Architecture Principles, examples)

The document is designed to be read every session while staying concise and actionable.
