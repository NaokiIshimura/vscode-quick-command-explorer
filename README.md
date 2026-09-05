# Quick Command Explorer

English | [日本語](README-JP.md)

A VSCode extension that lists frequently used VSCode commands in the Explorer sidebar and runs them with a single click.

The Command Palette (`Cmd+Shift+P`) assumes you already remember the command name.
Quick Command Explorer instead lets you **pick from a list sorted by command name in ascending order**, making commands easier to discover and faster to run.

## Built-in commands

Five commands ship with the extension. They are displayed **in ascending order by command name**.

| # | Command name | Command ID | Description |
| --- | --- | --- | --- |
| 1 | Duplicate As Workspace in New Window | `workbench.action.duplicateWorkspaceInNewWindow` | Duplicate the current workspace in a new window |
| 2 | Merge All Windows | `workbench.action.mergeAllWindowTabs` | Merge all windows into one (**macOS only**) |
| 3 | Open Integrated Browser | `workbench.action.browser.open` | Open the integrated browser |
| 4 | Open Repository on GitHub | `quickCommander.openRepositoryOnGitHub` | Open the page of the current repository remote in the external browser |
| 5 | Open Repository on GitHub in Integrated Browser | `quickCommander.openRepositoryOnGitHubInIntegratedBrowser` | Open the same page in the integrated browser |

Use the `quickCommander.customCommands` setting to add more commands.

### Open Repository on GitHub

These two commands are contributed by the extension itself rather than by VSCode.

They read the remote of the repository opened in the current window through the
Git extension bundled with VSCode, convert the remote URL into an https URL,
and open it — in the external browser, or in the integrated browser for the
`in Integrated Browser` variant.

| Step | Behaviour |
| --- | --- |
| Repository | The first repository opened in the window |
| Remote | `origin`, or the first remote that has a URL |
| URL | The SSH form (`git@github.com:owner/repo.git`) and the scheme form (`https://`, `ssh://`, `git://`) are both converted to `https://host/owner/repo` |

A warning is shown instead of opening a page when the Git extension is
disabled, when no repository is open, when the repository has no remote, or
when the remote URL cannot be converted.

### Availability

Commands that are not available in the current environment are hidden by default.

| Command | Requirement |
| --- | --- |
| Merge All Windows | macOS with `window.nativeTabs` enabled |
| Open Integrated Browser | A VSCode build that ships the integrated browser (confirmed on 1.136 and later) |
| Open Repository on GitHub in Integrated Browser | Same as above, because it hands the URL to `workbench.action.browser.open` |

Enable `quickCommander.showUnavailableCommands` to show them anyway, marked with a warning icon.

## Features

| Feature | Description |
| --- | --- |
| Command list | Flat list sorted by command name in ascending order. Click to run |
| Favorites | Starred commands are shown at the top, sorted by command name. Collapsed on startup |
| Recently Used | Recently executed commands, **most recently executed first**. Collapsed on startup |
| Quick search | Filter and run through a QuickPick from the `$(search)` button in the view header |
| Custom commands | Add any command to the list through the settings |
| Category view | Enable `groupByCategory` to switch to a grouped, two-level tree |
| Copy command ID | Copy a command ID to the clipboard from the context menu |

### Ordering

| Target | Order |
| --- | --- |
| Main command list | Ascending by command name |
| Favorites | Ascending by command name |
| Recently Used | Most recently executed first (history is not sorted by name) |
| Quick search (QuickPick) | Ascending by command name |
| Within a category in category view | Ascending by command name |

The comparison pins the locale to `en`, ignores case, and compares numbers naturally (`Item 2` before `Item 10`).

## Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `quickCommander.groupByCategory` | boolean | `false` | Group commands by category |
| `quickCommander.visibleCategories` | string[] | all categories | Categories to show in the list |
| `quickCommander.customCommands` | object[] | `[]` | Additional commands to show in the list |
| `quickCommander.historyLimit` | number | `10` | Number of commands to keep in Recently Used |
| `quickCommander.showUnavailableCommands` | boolean | `false` | Also show unavailable commands |
| `quickCommander.showFavoritesSection` | boolean | `true` | Show the Favorites section |
| `quickCommander.showRecentSection` | boolean | `true` | Show the Recently Used section |

### Adding custom commands

```jsonc
{
  "quickCommander.customCommands": [
    {
      "id": "workbench.action.terminal.new",
      "label": "Create New Terminal",
      "category": "custom",
      "description": "Open a new terminal",
      "icon": "terminal"
    },
    {
      "id": "workbench.action.toggleZenMode",
      "label": "Toggle Zen Mode",
      "icon": "screen-full"
    }
  ]
}
```

| Property | Required | Description |
| --- | --- | --- |
| `id` | Yes | VSCode command ID |
| `label` | Yes | Name shown in the list (commands are sorted by this name) |
| `category` | | `browser` / `workspace` / `window` / `custom` (default: `custom`) |
| `description` | | Additional explanation shown in the tooltip |
| `icon` | | A [ThemeIcon](https://code.visualstudio.com/api/references/icons-in-labels) ID |
| `args` | | Arguments passed when the command is executed |

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Compile in watch mode
npm run watch

# Run the tests
npm test

# Run the tests with coverage
npm run test:coverage

# Create a VSIX package
npx vsce package
```

Press F5 to launch the Extension Development Host and try the extension.

## License

ISC
