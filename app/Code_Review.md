# Code Analysis Report

## Executive Summary

The application is built on a modern and robust technology stack (React 19, Vite 7, TypeScript 5.9, Capacitor 7). The architecture follows best practices with a clear separation of concerns, utilizing Zustand for state management and TanStack Query for data fetching.

However, there are critical areas that need attention before a production release, particularly regarding **security** (custom crypto implementation, dev proxy configuration) and **performance** (lack of list virtualization).

---

## 1. Production Quality

### Strengths
- **Modern Stack**: Utilization of the latest versions of React, Vite, and Capacitor ensures long-term maintainability and access to performance features.
- **Error Handling**: A global `ErrorBoundary` wraps the application, and the API client implements a robust interceptor for handling 401 Unauthorized errors and token refreshing.
- **State Management**: Zustand is used effectively for global state, and TanStack Query handles server state with caching and retries.

### Areas for Improvement
- **Performance (Critical)**: The `Events` page renders a list of events (default limit 300) without virtualization. On mobile devices, rendering hundreds of complex `EventCard` components will cause significant layout thrashing and scroll lag.
  - **Recommendation**: Implement `@tanstack/react-virtual` to render only the items currently in the viewport.
- **Build Configuration**: The `vite.config.ts` is minimal. It lacks path aliases (e.g., `@/components`), which simplifies imports and refactoring.
- **Testing**: While Playwright is configured for E2E testing, there is no unit testing framework (like Vitest) visible in `package.json` or `vite.config.ts`. Complex logic in `src/lib` and hooks should be unit tested.

---

## 2. Code Quality

### Strengths
- **TypeScript Strictness**: `strict: true` is enabled in `tsconfig.app.json`, ensuring high type safety.
- **Linting**: Modern Flat Config for ESLint is used with React Hooks and TypeScript plugins.
- **Modularity**: The codebase is well-organized into `api`, `components`, `hooks`, `pages`, and `stores`.
- **Validation**: Zod is used for runtime validation of API responses (e.g., `LoginResponseSchema`), which is excellent for preventing runtime errors from unexpected API payloads.

### Areas for Improvement
- **Hardcoded Values**: The `Events` page has a hardcoded limit check (`300`). This should be a constant or derived from the settings store directly.
- **Component Granularity**: `Events.tsx` is quite large. The filter logic and popover could be extracted into a separate `EventFilters` component to improve readability.

---

## 3. Security

### Strengths
- **Token Management**: Access tokens are kept in memory (Zustand) and not persisted to `localStorage` (only refresh tokens are).
- **Native Security**: On mobile, `CapacitorHttp` is used, which bypasses CORS and uses native SSL handling.

### Critical Vulnerabilities
1.  **Weak Custom Encryption**:
    - **Issue**: `src/lib/crypto.ts` implements a custom encryption wrapper for `localStorage` using `PBKDF2` with a hardcoded salt (`zmng-v1`) and `navigator.userAgent` as entropy.
    - **Risk**: This provides only obfuscation, not security. If an attacker gains access to the device's file system or `localStorage`, they can easily derive the key.
    - **Recommendation**: Replace this with `@capacitor/preferences` (formerly Storage) which uses the native OS secure storage (Keychain on iOS, Keystore on Android) for sensitive data like refresh tokens.

2.  **Insecure Dev Proxy**:
    - **Issue**: `proxy-server.js` sets `Access-Control-Allow-Origin: *`.
    - **Risk**: While intended for dev, if this script is ever run in a context accessible to others (e.g., exposed on a network), it allows any origin to proxy requests through your machine.
    - **Recommendation**: Restrict `Access-Control-Allow-Origin` to `localhost` or specific trusted domains, even in development. Ensure this file is strictly excluded from production builds.

3.  **Token Transmission**:
    - **Issue**: The API client injects the auth token into query parameters for GET requests (`?token=...`).
    - **Risk**: Tokens in URLs are often logged by proxies, servers, and browser history.
    - **Recommendation**: If the ZoneMinder API supports it, switch to sending the token in the `Authorization` header (e.g., `Authorization: Bearer <token>`).

---

## Action Plan

1.  **Refactor Storage**: Replace `src/lib/crypto.ts` usage with `@capacitor/preferences` for secure storage.
2.  **Virtualize Lists**: Implement virtualization in `Events.tsx` and `Montage.tsx` (if applicable).
3.  **Harden Proxy**: Restrict CORS in `proxy-server.js`.
4.  **Add Unit Tests**: Install Vitest and add tests for `src/lib` utilities and custom hooks.
