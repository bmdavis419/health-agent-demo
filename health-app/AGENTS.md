# Agent Guidelines

## Commands

- **Dev**: `bun dev` - Start development server
- **Build**: `bun build` - Build for production
- **Check**: `bun check` - Type check and sync SvelteKit
- **Format**: `bun format` - Format code with Prettier
- **Lint**: `bun lint` - Check code formatting

## Code Style

- **Indentation**: Tabs (not spaces)
- **Quotes**: Single quotes
- **Line width**: 100 characters
- **Trailing commas**: None
- **Formatting**: Prettier with Svelte and Tailwind plugins
- **TypeScript**: Strict mode enabled, bundler module resolution

## Project Structure

- **Framework**: SvelteKit with TypeScript
- **Styling**: TailwindCSS v4
- **Key deps**: neverthrow (error handling), zod (validation), marked (markdown)
- **Adapter**: Vercel
- **Remote functions**: Enabled (experimental)

## Error Handling

- Use `neverthrow` ResultAsync for async operations
- Return proper HTTP error codes via SvelteKit's `error()` helper
- Always log errors before returning them
