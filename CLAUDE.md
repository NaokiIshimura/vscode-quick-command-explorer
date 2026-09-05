# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quick Commander is a VSCode extension that lists frequently used VSCode commands in the
Explorer sidebar and runs them with a single click.
Commands are displayed as a flat list sorted by **command name in ascending order**.

## Development Commands

### Build and Compilation
```bash
# Compile TypeScript
npm run compile

# Compile in watch mode (during development)
npm run watch

# Production build (before creating the VSIX)
npm run vscode:prepublish
```

### Testing
```bash
# Run the tests
npm test

# Run a single test file
npm test -- src/test/commandService.test.ts

# Run the tests in watch mode
npm run test:watch

# Run the tests with coverage
npm run test:coverage
```

### Development
```bash
# Press F5 to launch the Extension Development Host
# or use Run > Start Debugging in VSCode
```

### VSIX Package Creation
```bash
# Create a VSIX package
npx vsce package
```

## Architecture

### Main components

The project follows the same standard VSCode extension MVC layout as the reference
project, Quick Explorer.

1. **extension.ts** - Entry point
   - `activate()`: called when the extension starts
   - Creates the service and the view provider, creates the tree view, registers the commands
   - Calls `refreshAvailableCommands()` on startup to load the registered command list before the first render
   - Registered commands:
     - `quickCommander.execute`: run a command (invoked when a tree item is clicked)
     - `quickCommander.refresh`: reload the registered command list and refresh the view
     - `quickCommander.search`: quick search through a QuickPick
     - `quickCommander.openSettings`: open the settings page
     - `quickCommander.toggleFavorite`: add or remove a favorite
     - `quickCommander.copyCommandId`: copy a command ID to the clipboard
     - `quickCommander.clearHistory`: clear the execution history

2. **QuickCommanderViewProvider** - TreeDataProvider implementation
   - Renders a **flat single-level list** by default, sorted by command name in ascending order
   - Switches to a two-level category tree only when `quickCommander.groupByCategory` is enabled
   - Hides the `Favorites` and `Recently Used` sections when they are empty
   - Owns the refresh notification (EventEmitter)

3. **CommandService** - Domain logic
   - Command execution (commands marked with `confirm` go through a confirmation dialog)
   - Execution history, kept in `globalState` as an LRU list
   - Favorites, kept in `globalState`
   - Availability checks using `vscode.commands.getCommands(true)` and `process.platform`
   - Settings loading and validation of custom commands

4. **quickCommanderTreeItem.ts** - Concrete tree items
   - `CommandTreeItem`: a command; clicking it runs `quickCommander.execute`
   - `SectionTreeItem`: the `Favorites` / `Recently Used` headings
   - `CategoryTreeItem`: a category heading (only when `groupByCategory` is enabled)

5. **commandCatalog.ts** - Built-in command definitions
   - `BUILT_IN_COMMANDS` is written in ascending order by command name
   - Adding a command should only require editing this file

6. **types.ts** - Type definitions and helpers
   - `CommandCategory` / `SectionKind` / `TreeNodeKind` enums
   - `CommandDefinition` interface
   - `compareCommandsByLabel()`: **the single definition of the ordering**

### Data flow

```
User Click
  → CommandTreeItem.command
    → Extension.registerCommand('quickCommander.execute')
      → CommandService.execute()
        → vscode.commands.executeCommand()
        → CommandService.addToHistory()
          → ViewProvider.refresh()
            → TreeDataProvider.onDidChangeTreeData.fire()
              → VSCode updates TreeView
```

### Key design decisions

- **Ordering lives solely in `compareCommandsByLabel`**
  Sorting separately in the tree, the QuickPick and the favorites would let the behaviour
  drift apart, so `CommandService.getVisibleCommands()` is the single source of truth for
  the displayed list
- **`Recently Used` is the only list ordered by recency**
  History would lose its meaning if it were sorted by command name
- **Locale-independent comparison**
  `localeCompare` is called with an explicit `'en'` so tests do not depend on the runtime
  locale. `sensitivity: 'base'` ignores case, `numeric: true` compares numbers naturally,
  and the command ID is used as a secondary key so equal labels still order deterministically
- **Never mutate `readonly` arrays**
  `getSortedCommands()` returns a new array via `[...commands].sort(...)`
- **Unavailable commands are hidden by default**
  Some commands do not exist depending on the VSCode version or the platform, so the
  command ID list loaded at startup and the `platforms` field decide what is shown

## Code Conventions

### Comments
- **English comments**: comments in this project are written in English
- Classes, methods and non-obvious logic carry JSDoc-style comments

### Documentation
- `README.md` is the English documentation and is the canonical version
- `README-JP.md` is the Japanese translation; keep both in sync when either changes

### File layout
- Always end files with a trailing newline
- TypeScript sources live under `src/`
- Test files live under `src/test/`
- Compiled JavaScript is emitted to `out/`

### Test setup
- **Framework**: Vitest
- **Mocks**: the VSCode API mock lives in `src/test/__mocks__/vscode.ts`
  - Call `__resetMock()` to reset the state, then write to `__mockState` to control behaviour
  - Use `__createMemento()` to create a `globalState` stand-in
- **Coverage**: v8 provider. `src/extension.ts` is excluded

### TypeScript settings
- Strict mode enabled
- Target: ES2020
- Module: CommonJS

### Interfaces
- Interface properties are marked `readonly`

## Release Process

Releases are automated with GitHub Actions (`.github/workflows/release-vsix.yml`):

1. Runs on a push to `main` or when a release is published
2. Installs dependencies → compiles → runs the tests → creates the VSIX package
3. Uploads the `.vsix` file to GitHub Releases
