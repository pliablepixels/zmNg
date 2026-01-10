# zmNg Developer Guide

Comprehensive guide for developing the zmNg ZoneMinder mobile and desktop application.

## Overview

This guide is designed for experienced programmers who may not be familiar with React, React Native, or modern frontend development. It explains concepts from first principles and describes the actual codebase architecture.

## Table of Contents

1. **[Introduction](./01-introduction.md)**
   - What is zmNg
   - Who this guide is for
   - Learning path recommendations

2. **[React Fundamentals](./02-react-fundamentals.md)**
   - What is React and how it works
   - Components, props, and state
   - Hooks (useState, useEffect, useCallback, useRef, useMemo)
   - Rendering and re-rendering explained
   - Object identity and why it matters

3. **[State Management with Zustand](./03-state-management-zustand.md)**
   - Why global state management
   - Creating and using stores
   - Selectors for optimizing re-renders
   - Persistence and working outside React
   - **Critical**: Object references and infinite loops (preview)

4. **[Pages and Views](./04-pages-and-views.md)**
   - Dashboard page and DashboardLayout
   - Montage page for multi-monitor view
   - Monitors, Events, and Settings pages
   - **Real Example**: Infinite loop bugs and fixes with actual code
   - ResizeObserver pattern and the ref solution

5. **[Component Architecture](./05-component-architecture.md)**
   - Component organization (monitors/, dashboard/, events/, ui/)
   - MonitorCard and MontageMonitor components
   - Dashboard widgets and grid layout
   - Event components and video player
   - Testing data attributes and patterns

6. **[Testing Strategy](./06-testing-strategy.md)**
   - Unit tests with Vitest and React Testing Library
   - E2E tests with Playwright and Gherkin
   - Test organization and running tests
   - Dynamic selectors for server-agnostic tests
   - Test-driven development workflow

7. **[API and Data Fetching](./07-api-and-data-fetching.md)**
   - ZoneMinder API overview
   - Authentication and connection keys
   - React Query integration
   - Queries, mutations, and infinite queries
   - Complete data flow example

8. **[Common Pitfalls](./08-common-pitfalls.md)**
   - React pitfalls (unstable dependencies, missing cleanup, etc.)
   - Zustand pitfalls (object references as dependencies)
   - React Query pitfalls (missing enabled, incorrect keys)
   - Testing pitfalls (hardcoded values, missing mocks)
   - Performance, i18n, and security issues
   - Pre-code review checklist

9. **[Contributing](./09-contributing.md)**
   - Development workflow
   - Branch naming and commit messages
   - Testing requirements
   - Code review guidelines
   - Common contribution scenarios

10. **[Key Libraries](./10-key-libraries.md)**
    - UI and Visualization (react-grid-layout, vis-timeline)
    - Data and Logic (date-fns, react-hook-form)
    - Mobile Platform (@capacitor)

11. **[Application Lifecycle](./11-application-lifecycle.md)**
    - The "Runtime Map" from entry point to main loop
    - Authentication, Hydration, and Mobile Lifecycle

12. **[Shared Services and Components](./12-shared-services-and-components.md)**
    - Logger, HTTP Client, Download Utilities
    - Proxy Utils, URL Builder, Time Utils
    - Crypto, Secure Storage, Platform Detection
    - Reusable UI Components
    - Domain Components and Usage Patterns


## Quick Start

### For React Beginners

If you're new to React:

1. Read **Chapter 2: React Fundamentals** - understand the mental model
2. Read **Chapter 3: State Management** - learn Zustand patterns
3. Study **Chapter 4: Pages and Views** - see infinite loop examples
4. Review **Chapter 6: Testing Strategy** - learn testing approach
5. Reference other chapters as needed

### For React Developers

If you're familiar with React:

1. Skim **Chapter 2** to confirm understanding
2. Read **Chapter 3** for Zustand-specific patterns
3. Read **Chapter 4** for infinite loop issues (important!)
4. Review **Chapter 6** for testing approach
5. Reference **Chapter 8** for common pitfalls

### For Contributors

Before contributing:

1. Read **Chapter 4-5** to understand the codebase
2. Read **Chapter 12** to understand shared services and components
3. Read **Chapter 6** for testing requirements
4. Read **Chapter 8** to avoid common mistakes
5. Follow **Chapter 9** for contribution workflow
6. Always check `AGENTS.md` for requirements


## Additional Resources

- **AGENTS.md**: Development guidelines and pre-commit checklist
- **tests/README.md**: Testing documentation

## Getting Help

- Questions about code: Review relevant chapter in this guide
- Bug reports: Create GitHub issue
- Feature requests: Create GitHub issue
- Contributing: See **Chapter 9**

## Contributing

We welcome contributions! Please read **[Chapter 9: Contributing](./09-contributing.md)** for the complete workflow and guidelines.

Key points:
- Write tests BEFORE or DURING implementation
- Update all language files
- Follow commit message format
- Verify all tests pass before pushing
- Reference issues in commits

## License

See LICENSE file in repository root.
