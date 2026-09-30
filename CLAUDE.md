# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quick Command Explorer is a VSCode extension that lists frequently used VSCode commands in the
Explorer sidebar and runs them with a single click.
Commands are grouped by category (Workspace → Window → Integrated Browser → Repository → Custom)
and sorted by **command name in ascending order** within each category.

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
   - Calls `refreshAvailableCommands()` on startup to load the registered command list before the first render.
     It runs **after** the command registrations so the commands contributed by this extension are part of the loaded list
   - Registered commands:
     - `quickCommander.execute`: run a command (invoked when a tree item is clicked)
     - `quickCommander.refresh`: reload the registered command list and refresh the view
     - `quickCommander.search`: quick search through a QuickPick
     - `quickCommander.openSettings`: open the settings page
     - `quickCommander.toggleFavorite`: add or remove a favorite
     - `quickCommander.copyCommandId`: copy a command ID to the clipboard
     - `quickCommander.openIntegratedBrowserOnTheRight`: open the integrated browser and move it
       to the editor group on the right
     - `quickCommander.openRepositoryOnGitHub`: open the page of the current repository remote in the external browser
     - `quickCommander.openRepositoryOnGitHubInIntegratedBrowser`: open the same page in the integrated browser

2. **QuickCommanderViewProvider** - TreeDataProvider implementation
   - Renders a **two-level category tree** by default, in the order of `CATEGORY_ORDER`
   - Switches to a flat single-level list sorted by command name when
     `quickCommander.groupByCategory` is disabled
   - Hides the `Favorites` section when it is empty
   - Renders the `Favorites` section collapsed on startup
   - Owns the refresh notification (EventEmitter)

3. **CommandService** - Domain logic
   - Command execution (commands marked with `confirm` go through a confirmation dialog)
   - Favorites, kept in `globalState`
   - Availability checks using `vscode.commands.getCommands(true)`, `process.platform` and the
     `requires` field (commands this extension contributes itself always have their own ID
     registered, so `requires` is what says whether their dependency exists)
   - Settings loading and validation of custom commands

4. **quickCommanderTreeItem.ts** - Concrete tree items
   - `CommandTreeItem`: a command; clicking it runs `quickCommander.execute`
   - `SectionTreeItem`: the `Favorites` heading, collapsed by default
   - `CategoryTreeItem`: a category heading (only when `groupByCategory` is enabled, which is the default)

5. **commandCatalog.ts** - Built-in command definitions
   - `BUILT_IN_COMMANDS` is written in ascending order by command name
   - Adding a command should only require editing this file, unless the command is
     contributed by this extension rather than by VSCode

6. **integratedBrowserService.ts** - Integrated browser helpers
   - `openIntegratedBrowserInRightGroup()` backs `quickCommander.openIntegratedBrowserOnTheRight`
   - Opens the browser, then runs `workbench.action.moveEditorToRightGroup` so the browser
     ends up in a split on the right instead of covering the code
   - Errors are left to propagate, because `CommandService.execute()` already turns a rejected
     command into an error notification

7. **gitRepositoryService.ts** - Git repository lookup
   - Reads the remotes through the Git extension bundled with VSCode (`vscode.git`)
   - `toBrowsableUrl()` converts a remote URL (SSH or scheme form) into an https URL
   - `openRepositoryInExternalBrowser()` / `openRepositoryInIntegratedBrowser()` back the two
     `quickCommander.openRepositoryOnGitHub*` commands
   - The integrated browser variant passes the URL to `workbench.action.browser.open`,
     which accepts either a URL string or an options object

8. **types.ts** - Type definitions and helpers
   - `CommandCategory` / `SectionKind` / `TreeNodeKind` enums
   - `CommandDefinition` interface
   - `compareCommandsByLabel()`: **the single definition of the ordering**
   - `CATEGORY_ORDER`: display order of the category headings
   - `stringToCategory()` still reads the legacy `browser` settings value as `IntegratedBrowser`

### Data flow

```
User Click
  → CommandTreeItem.command
    → Extension.registerCommand('quickCommander.execute')
      → CommandService.execute()
        → vscode.commands.executeCommand()
```

### Key design decisions

- **Ordering lives solely in `compareCommandsByLabel`**
  Sorting separately in the tree, the QuickPick and the favorites would let the behaviour
  drift apart, so `CommandService.getVisibleCommands()` is the single source of truth for
  the displayed list
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

Releases are automated with GitHub Actions. The build is shared by both release workflows
through a reusable workflow:

- `.github/workflows/build-vsix.yml` - reusable workflow (`workflow_call`)
  1. Installs dependencies → compiles → runs the tests → creates the VSIX package
  2. Uploads the `.vsix` as a short-lived artifact and exposes the `version` and
     `vsix-filename` outputs to the calling workflow
- `.github/workflows/release-vsix.yml` - runs on a push to `main`, when a release is
  published, or manually; downloads the built artifact and uploads the `.vsix` file to
  GitHub Releases
- `.github/workflows/publish-marketplace.yml` - runs on the same events; downloads the
  built artifact and publishes it with `vsce publish`. It needs the `VSCE_PAT` repository
  secret; when the secret is missing the publishing step is skipped instead of failing

### Version bump

The workflows do not assign version numbers, so the version has to be bumped by hand:

- **Bump `version` in `package.json` whenever you create a pull request** (e.g. `0.0.6` → `0.0.7`)
  - Include the bump in the same commit / PR as the change itself
  - Prefix the PR title with the new version, e.g. `v0.0.7: ...`
  - `package-lock.json` is ignored by git, so it does not need updating
- Forgetting the bump makes the release workflow upload a VSIX with the same version as the previous release
