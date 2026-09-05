import * as vscode from 'vscode';
import { BUILT_IN_COMMANDS, getSortedCommands } from './commandCatalog';
import {
  CommandCategory,
  CommandDefinition,
  stringToCategory,
} from './types';

/** Configuration section name */
export const CONFIGURATION_SECTION = 'quickCommander';

/** globalState key holding the favorites */
const FAVORITES_STATE_KEY = 'quickCommander.favorites';

/** globalState key holding the execution history */
const HISTORY_STATE_KEY = 'quickCommander.history';

/** Default number of history entries to keep */
const DEFAULT_HISTORY_LIMIT = 10;

/**
 * Raw custom command entry as read from the settings.
 */
interface RawCustomCommand {
  readonly id?: unknown;
  readonly label?: unknown;
  readonly category?: unknown;
  readonly description?: unknown;
  readonly icon?: unknown;
  readonly args?: unknown;
}

/**
 * Handles command execution, history, favorites and availability checks.
 *
 * Command arrays meant for display are always returned sorted by command name
 * in ascending order. The ordering logic lives solely in
 * compareCommandsByLabel in types.ts.
 */
export class CommandService {
  /** Cache of the command IDs registered in VSCode */
  private availableCommandIds: Set<string> | undefined;

  /** Signature of the last warning shown for invalid custom commands */
  private lastInvalidCustomCommandSignature: string | undefined;

  /**
   * @param globalState Extension global state, used to persist favorites and history
   */
  constructor(private readonly globalState: vscode.Memento) {}

  /**
   * Returns the extension configuration.
   * @returns Configuration object
   */
  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  }

  /**
   * Whether commands are grouped by category.
   */
  isGroupByCategory(): boolean {
    return this.getConfiguration().get<boolean>('groupByCategory', false);
  }

  /**
   * Whether unavailable commands are shown.
   */
  isShowUnavailableCommands(): boolean {
    return this.getConfiguration().get<boolean>('showUnavailableCommands', false);
  }

  /**
   * Whether the Favorites section is shown.
   */
  isShowFavoritesSection(): boolean {
    return this.getConfiguration().get<boolean>('showFavoritesSection', true);
  }

  /**
   * Whether the Recently Used section is shown.
   */
  isShowRecentSection(): boolean {
    return this.getConfiguration().get<boolean>('showRecentSection', true);
  }

  /**
   * Returns the number of history entries to keep.
   * Falls back to the default when the setting is not a positive number.
   */
  getHistoryLimit(): number {
    const limit = this.getConfiguration().get<number>(
      'historyLimit',
      DEFAULT_HISTORY_LIMIT
    );

    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
      return DEFAULT_HISTORY_LIMIT;
    }

    return Math.floor(limit);
  }

  /**
   * Returns the categories to display.
   * @returns Categories to display
   */
  getVisibleCategories(): CommandCategory[] {
    const values = this.getConfiguration().get<string[]>('visibleCategories', [
      CommandCategory.Browser,
      CommandCategory.Workspace,
      CommandCategory.Window,
      CommandCategory.Custom,
    ]);

    if (!Array.isArray(values)) {
      return [...Object.values(CommandCategory)];
    }

    return values
      .filter((value): value is string => typeof value === 'string')
      .map(stringToCategory);
  }

  /**
   * Loads and caches the command IDs registered in VSCode.
   */
  async refreshAvailableCommands(): Promise<void> {
    const ids = await vscode.commands.getCommands(true);
    this.availableCommandIds = new Set(ids);
  }

  /**
   * Checks whether a command is registered in VSCode.
   * Returns true when the cache has not been loaded yet, since no decision
   * can be made at that point.
   * @param definition Command definition
   * @returns True when the command is registered
   */
  isAvailable(definition: CommandDefinition): boolean {
    if (!this.availableCommandIds) {
      return true;
    }

    return this.availableCommandIds.has(definition.id);
  }

  /**
   * Checks whether a command can run on the current platform.
   * @param definition Command definition
   * @returns True when the command can run
   */
  isSupportedPlatform(definition: CommandDefinition): boolean {
    if (!definition.platforms || definition.platforms.length === 0) {
      return true;
    }

    return definition.platforms.includes(process.platform);
  }

  /**
   * Checks whether a command should appear in the list.
   * @param definition Command definition
   * @returns True when the command should be shown
   */
  isVisible(definition: CommandDefinition): boolean {
    if (this.isShowUnavailableCommands()) {
      return true;
    }

    return this.isSupportedPlatform(definition) && this.isAvailable(definition);
  }

  /**
   * Returns the custom commands added through the settings.
   * Entries missing an id or a label are skipped, and a warning is shown only
   * when the set of invalid entries changes.
   * @returns Custom command definitions
   */
  getCustomCommands(): CommandDefinition[] {
    const raw = this.getConfiguration().get<RawCustomCommand[]>(
      'customCommands',
      []
    );

    if (!Array.isArray(raw)) {
      return [];
    }

    const commands: CommandDefinition[] = [];
    const invalidIndexes: number[] = [];

    raw.forEach((entry, index) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.id !== 'string' ||
        entry.id.trim() === '' ||
        typeof entry.label !== 'string' ||
        entry.label.trim() === ''
      ) {
        invalidIndexes.push(index);
        return;
      }

      commands.push({
        id: entry.id,
        label: entry.label,
        category:
          typeof entry.category === 'string'
            ? stringToCategory(entry.category)
            : CommandCategory.Custom,
        description:
          typeof entry.description === 'string' ? entry.description : undefined,
        icon: typeof entry.icon === 'string' ? entry.icon : undefined,
        args: Array.isArray(entry.args) ? entry.args : undefined,
      });
    });

    this.warnInvalidCustomCommands(invalidIndexes);

    return commands;
  }

  /**
   * Shows a warning about invalid custom commands.
   * Compares against the last warning so the same notification is not repeated.
   * @param invalidIndexes Indexes of the invalid entries
   */
  private warnInvalidCustomCommands(invalidIndexes: number[]): void {
    const signature = invalidIndexes.join(',');

    if (signature === this.lastInvalidCustomCommandSignature) {
      return;
    }

    this.lastInvalidCustomCommandSignature = signature;

    if (invalidIndexes.length === 0) {
      return;
    }

    vscode.window.showWarningMessage(
      `Quick Commander: ignored ${invalidIndexes.length} entries in ` +
        `${CONFIGURATION_SECTION}.customCommands because they are missing an id or a label`
    );
  }

  /**
   * Returns the built-in and custom commands merged together.
   * Custom commands win when a command ID appears in both.
   * @returns Commands sorted by command name in ascending order
   */
  getAllCommands(): CommandDefinition[] {
    const merged = new Map<string, CommandDefinition>();

    BUILT_IN_COMMANDS.forEach((command) => merged.set(command.id, command));
    this.getCustomCommands().forEach((command) =>
      merged.set(command.id, command)
    );

    return getSortedCommands([...merged.values()]);
  }

  /**
   * Returns the commands to display in the list.
   * Both the tree view and the quick search use this method as their single
   * source of truth.
   * @returns Commands sorted by command name in ascending order
   */
  getVisibleCommands(): CommandDefinition[] {
    const visibleCategories = this.getVisibleCategories();

    return this.getAllCommands().filter(
      (command) =>
        this.isVisible(command) && visibleCategories.includes(command.category)
    );
  }

  /**
   * Returns the visible commands of a category.
   * @param category Category
   * @returns Commands sorted by command name in ascending order
   */
  getVisibleCommandsByCategory(category: CommandCategory): CommandDefinition[] {
    return this.getVisibleCommands().filter(
      (command) => command.category === category
    );
  }

  /**
   * Returns the command IDs registered as favorites.
   * @returns Command IDs
   */
  private getFavoriteIds(): string[] {
    const ids = this.globalState.get<string[]>(FAVORITES_STATE_KEY, []);

    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === 'string')
      : [];
  }

  /**
   * Returns the favorite commands.
   * Favorites are an explicit user choice, so they are shown regardless of the
   * visible category setting.
   * @returns Commands sorted by command name in ascending order
   */
  getFavorites(): CommandDefinition[] {
    const favoriteIds = new Set(this.getFavoriteIds());

    return this.getAllCommands().filter(
      (command) => favoriteIds.has(command.id) && this.isVisible(command)
    );
  }

  /**
   * Checks whether a command is registered as a favorite.
   * @param id Command ID
   * @returns True when registered
   */
  isFavorite(id: string): boolean {
    return this.getFavoriteIds().includes(id);
  }

  /**
   * Toggles the favorite state of a command.
   * @param id Command ID
   * @returns The state after toggling (true when registered)
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const favoriteIds = this.getFavoriteIds();
    const index = favoriteIds.indexOf(id);
    const isRegistered = index === -1;

    if (isRegistered) {
      favoriteIds.push(id);
    } else {
      favoriteIds.splice(index, 1);
    }

    await this.globalState.update(FAVORITES_STATE_KEY, favoriteIds);

    return isRegistered;
  }

  /**
   * Returns the command IDs in the execution history (most recent first).
   * @returns Command IDs
   */
  private getHistoryIds(): string[] {
    const ids = this.globalState.get<string[]>(HISTORY_STATE_KEY, []);

    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === 'string')
      : [];
  }

  /**
   * Returns the recently used commands.
   * History is ordered by execution recency rather than by command name.
   * @returns Commands ordered by most recent execution first
   */
  getHistory(): CommandDefinition[] {
    const commandsById = new Map(
      this.getAllCommands().map((command) => [command.id, command])
    );

    return this.getHistoryIds()
      .map((id) => commandsById.get(id))
      .filter(
        (command): command is CommandDefinition =>
          command !== undefined && this.isVisible(command)
      )
      .slice(0, this.getHistoryLimit());
  }

  /**
   * Adds a command to the execution history (LRU).
   * @param id Command ID
   */
  private async addToHistory(id: string): Promise<void> {
    const historyIds = this.getHistoryIds().filter(
      (historyId) => historyId !== id
    );

    historyIds.unshift(id);

    await this.globalState.update(
      HISTORY_STATE_KEY,
      historyIds.slice(0, this.getHistoryLimit())
    );
  }

  /**
   * Clears the execution history.
   */
  async clearHistory(): Promise<void> {
    await this.globalState.update(HISTORY_STATE_KEY, []);
  }

  /**
   * Executes a command.
   * Commands marked with confirm are executed only after a confirmation dialog.
   * @param definition Command definition
   * @returns True when executed, false when cancelled or failed
   */
  async execute(definition: CommandDefinition): Promise<boolean> {
    if (definition.confirm) {
      const answer = await vscode.window.showWarningMessage(
        `Run "${definition.label}"?`,
        { modal: true },
        'Run'
      );

      if (answer !== 'Run') {
        return false;
      }
    }

    try {
      await vscode.commands.executeCommand(
        definition.id,
        ...(definition.args ?? [])
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Quick Commander: failed to run "${definition.label}" (${message})`
      );

      return false;
    }

    await this.addToHistory(definition.id);

    return true;
  }
}
