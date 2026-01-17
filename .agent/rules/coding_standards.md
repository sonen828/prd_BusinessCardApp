# Project Coding Rules

## UI/UX Rules
1.  **Input Field Visibility**: All input fields (text, email, password, tel, date, etc.) must explicitly specify text color to ensure visibility in both light and dark modes. Use `@layer base` in `src/index.css` for global defaults.
2.  **Mac Date Input Fix**: Specifically for `input[type="date"]`, always ensure `bg-white` (or specific dark bg) and explicit text color are set, as Mac browsers can otherwise render selected dates invisibly depending on system theme.
3.  **Dark Mode Compatibility**: Always verify UI components in both light and dark modes.

## Architecture
1.  **Service Layer**: All Dexie.js database operations must remain in `src/services/db/`.
2.  **Store Layer**: Use Zustand for state management. Avoid complex logic in components.
