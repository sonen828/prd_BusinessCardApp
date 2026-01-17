# Project Coding Rules

## UI/UX Rules
1.  **Input Field Visibility**: All input fields (text, email, password, etc.) must explicitely specify text color to ensure visibility in both light and dark modes. Use `@layer base` in `src/index.css` for global defaults (`text-gray-900 dark:text-gray-100`).
2.  **Dark Mode Compatibility**: Always verify UI components in both light and dark modes.

## Architecture
1.  **Service Layer**: All Dexie.js database operations must remain in `src/services/db/`.
2.  **Store Layer**: Use Zustand for state management. Avoid complex logic in components.
