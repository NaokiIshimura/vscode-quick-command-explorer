import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __createMemento, __mockState, __resetMock } from './__mocks__/vscode';
import { CommandService } from '../commandService';
import { BUILT_IN_COMMANDS } from '../commandCatalog';
import { CommandCategory, CommandDefinition } from '../types';

const BROWSER_ID = 'workbench.action.browser.open';
const DUPLICATE_ID = 'workbench.action.duplicateWorkspaceInNewWindow';
const MERGE_ID = 'workbench.action.mergeAllWindowTabs';

const ALL_BUILT_IN_IDS = BUILT_IN_COMMANDS.map((command) => command.id);

let memento: ReturnType<typeof __createMemento>;
let originalPlatform: PropertyDescriptor | undefined;

/**
 * Overrides process.platform.
 */
function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

/**
 * Creates a service with every built-in command available.
 */
async function createService(
  initialState: Record<string, unknown> = {}
): Promise<CommandService> {
  memento = __createMemento(initialState);
  const service = new CommandService(memento as never);
  await service.refreshAvailableCommands();

  return service;
}

beforeEach(() => {
  __resetMock();
  __mockState.availableCommands = [...ALL_BUILT_IN_IDS];
  originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  setPlatform('darwin');
});

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform);
  }
});

describe('configuration loading', () => {
  it('returns the default values', async () => {
    const service = await createService();

    expect(service.isGroupByCategory()).toBe(false);
    expect(service.isShowUnavailableCommands()).toBe(false);
    expect(service.isShowFavoritesSection()).toBe(true);
    expect(service.isShowRecentSection()).toBe(true);
    expect(service.getHistoryLimit()).toBe(10);
    expect(service.getVisibleCategories()).toEqual([
      CommandCategory.Browser,
      CommandCategory.Workspace,
      CommandCategory.Window,
      CommandCategory.Custom,
    ]);
  });

  it('reflects the configured values', async () => {
    __mockState.configuration = {
      'quickCommander.groupByCategory': true,
      'quickCommander.showUnavailableCommands': true,
      'quickCommander.showFavoritesSection': false,
      'quickCommander.showRecentSection': false,
      'quickCommander.historyLimit': 3,
      'quickCommander.visibleCategories': ['browser'],
    };
    const service = await createService();

    expect(service.isGroupByCategory()).toBe(true);
    expect(service.isShowUnavailableCommands()).toBe(true);
    expect(service.isShowFavoritesSection()).toBe(false);
    expect(service.isShowRecentSection()).toBe(false);
    expect(service.getHistoryLimit()).toBe(3);
    expect(service.getVisibleCategories()).toEqual([CommandCategory.Browser]);
  });

  it('falls back to the default when historyLimit is invalid', async () => {
    const service = await createService();

    __mockState.configuration['quickCommander.historyLimit'] = 0;
    expect(service.getHistoryLimit()).toBe(10);

    __mockState.configuration['quickCommander.historyLimit'] = -1;
    expect(service.getHistoryLimit()).toBe(10);

    __mockState.configuration['quickCommander.historyLimit'] = 'abc';
    expect(service.getHistoryLimit()).toBe(10);

    __mockState.configuration['quickCommander.historyLimit'] = Infinity;
    expect(service.getHistoryLimit()).toBe(10);

    __mockState.configuration['quickCommander.historyLimit'] = 5.7;
    expect(service.getHistoryLimit()).toBe(5);
  });

  it('returns every category when visibleCategories is not an array', async () => {
    __mockState.configuration['quickCommander.visibleCategories'] = 'browser';
    const service = await createService();

    expect(service.getVisibleCategories()).toEqual([
      CommandCategory.Browser,
      CommandCategory.Workspace,
      CommandCategory.Window,
      CommandCategory.Custom,
    ]);
  });

  it('ignores non-string entries in visibleCategories', async () => {
    __mockState.configuration['quickCommander.visibleCategories'] = [
      'browser',
      42,
    ];
    const service = await createService();

    expect(service.getVisibleCategories()).toEqual([CommandCategory.Browser]);
  });
});

describe('availability checks', () => {
  it('reports a registered command as available', async () => {
    const service = await createService();

    expect(service.isAvailable(BUILT_IN_COMMANDS[0])).toBe(true);
  });

  it('reports an unregistered command as unavailable', async () => {
    __mockState.availableCommands = [BROWSER_ID];
    const service = await createService();

    expect(service.isAvailable(BUILT_IN_COMMANDS[0])).toBe(false);
  });

  it('returns true before the command list has been loaded', () => {
    const service = new CommandService(__createMemento() as never);

    expect(service.isAvailable(BUILT_IN_COMMANDS[0])).toBe(true);
  });

  it('treats commands without platforms as runnable everywhere', async () => {
    const service = await createService();
    setPlatform('win32');

    expect(
      service.isSupportedPlatform({
        id: 'test.any',
        label: 'Any',
        category: CommandCategory.Custom,
      })
    ).toBe(true);
    expect(
      service.isSupportedPlatform({
        id: 'test.empty',
        label: 'Empty',
        category: CommandCategory.Custom,
        platforms: [],
      })
    ).toBe(true);
  });

  it('reports a command as unsupported on other platforms', async () => {
    const service = await createService();
    const merge = BUILT_IN_COMMANDS.find((c) => c.id === MERGE_ID)!;

    expect(service.isSupportedPlatform(merge)).toBe(true);

    setPlatform('win32');
    expect(service.isSupportedPlatform(merge)).toBe(false);
  });

  it('always shows commands when showUnavailableCommands is enabled', async () => {
    __mockState.availableCommands = [];
    __mockState.configuration['quickCommander.showUnavailableCommands'] = true;
    const service = await createService();

    setPlatform('win32');
    expect(service.isVisible(BUILT_IN_COMMANDS[0])).toBe(true);
  });
});

describe('getAllCommands / getVisibleCommands', () => {
  it('returns the built-in commands sorted by command name', async () => {
    const service = await createService();

    expect(service.getAllCommands().map((c) => c.label)).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
    ]);
  });

  it('keeps the ascending order after merging custom commands', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: 'test.zen', label: 'Zen Mode' },
      { id: 'test.add', label: 'Add Folder to Workspace' },
    ];
    __mockState.availableCommands = [
      ...ALL_BUILT_IN_IDS,
      'test.zen',
      'test.add',
    ];
    const service = await createService();

    expect(service.getVisibleCommands().map((c) => c.label)).toEqual([
      'Add Folder to Workspace',
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
      'Zen Mode',
    ]);
  });

  it('lets a custom command override a built-in one with the same ID', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: BROWSER_ID, label: 'Browser (Custom)' },
    ];
    const service = await createService();
    const commands = service.getAllCommands();

    expect(commands).toHaveLength(3);
    expect(commands.find((c) => c.id === BROWSER_ID)?.label).toBe(
      'Browser (Custom)'
    );
  });

  it('excludes unregistered commands', async () => {
    __mockState.availableCommands = [BROWSER_ID];
    const service = await createService();

    expect(service.getVisibleCommands().map((c) => c.id)).toEqual([BROWSER_ID]);
  });

  it('excludes commands not supported on the current platform', async () => {
    setPlatform('win32');
    const service = await createService();

    expect(service.getVisibleCommands().map((c) => c.id)).toEqual([
      DUPLICATE_ID,
      BROWSER_ID,
    ]);
  });

  it('filters by visibleCategories', async () => {
    __mockState.configuration['quickCommander.visibleCategories'] = ['window'];
    const service = await createService();

    expect(service.getVisibleCommands().map((c) => c.id)).toEqual([MERGE_ID]);
  });

  it('returns the visible commands of a given category', async () => {
    const service = await createService();

    expect(
      service.getVisibleCommandsByCategory(CommandCategory.Browser).map((c) => c.id)
    ).toEqual([BROWSER_ID]);
    expect(
      service.getVisibleCommandsByCategory(CommandCategory.Custom)
    ).toEqual([]);
  });
});

describe('getCustomCommands', () => {
  it('returns an empty array when unset', async () => {
    const service = await createService();

    expect(service.getCustomCommands()).toEqual([]);
  });

  it('returns an empty array when the setting is not an array', async () => {
    __mockState.configuration['quickCommander.customCommands'] = 'invalid';
    const service = await createService();

    expect(service.getCustomCommands()).toEqual([]);
  });

  it('reflects the optional fields', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      {
        id: 'test.full',
        label: 'Full',
        category: 'window',
        description: 'desc',
        icon: 'terminal',
        args: ['a'],
      },
    ];
    const service = await createService();

    expect(service.getCustomCommands()[0]).toEqual({
      id: 'test.full',
      label: 'Full',
      category: CommandCategory.Window,
      description: 'desc',
      icon: 'terminal',
      args: ['a'],
    });
  });

  it('leaves omitted fields undefined and falls back to the Custom category', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: 'test.min', label: 'Min', category: 1, description: 1, icon: 1, args: 'x' },
    ];
    const service = await createService();

    expect(service.getCustomCommands()[0]).toEqual({
      id: 'test.min',
      label: 'Min',
      category: CommandCategory.Custom,
      description: undefined,
      icon: undefined,
      args: undefined,
    });
  });

  it('skips entries missing an id or a label and warns', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { label: 'No Id' },
      { id: 'test.noLabel' },
      { id: '  ', label: 'Blank Id' },
      { id: 'test.blankLabel', label: '   ' },
      null,
      'string',
      { id: 'test.valid', label: 'Valid' },
    ];
    const service = await createService();

    expect(service.getCustomCommands().map((c) => c.id)).toEqual(['test.valid']);
    expect(__mockState.warningMessages).toHaveLength(1);
    expect(__mockState.warningMessages[0]).toContain('6 entries');
  });

  it('does not repeat the warning for the same invalid entries', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { label: 'No Id' },
    ];
    const service = await createService();

    service.getCustomCommands();
    service.getCustomCommands();
    service.getCustomCommands();

    expect(__mockState.warningMessages).toHaveLength(1);
  });

  it('warns again when the invalid entries change', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { label: 'No Id' },
    ];
    const service = await createService();

    service.getCustomCommands();
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: 'test.ok', label: 'OK' },
      { label: 'No Id' },
    ];
    service.getCustomCommands();

    expect(__mockState.warningMessages).toHaveLength(2);
  });

  it('does not warn again once the entries become valid', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { label: 'No Id' },
    ];
    const service = await createService();

    service.getCustomCommands();
    __mockState.configuration['quickCommander.customCommands'] = [];
    service.getCustomCommands();

    expect(__mockState.warningMessages).toHaveLength(1);
  });
});

describe('favorites', () => {
  it('is empty initially', async () => {
    const service = await createService();

    expect(service.getFavorites()).toEqual([]);
    expect(service.isFavorite(BROWSER_ID)).toBe(false);
  });

  it('toggles between registered and unregistered', async () => {
    const service = await createService();

    expect(await service.toggleFavorite(BROWSER_ID)).toBe(true);
    expect(service.isFavorite(BROWSER_ID)).toBe(true);

    expect(await service.toggleFavorite(BROWSER_ID)).toBe(false);
    expect(service.isFavorite(BROWSER_ID)).toBe(false);
  });

  it('returns the favorites sorted by command name', async () => {
    const service = await createService({
      'quickCommander.favorites': [BROWSER_ID, DUPLICATE_ID, MERGE_ID],
    });

    expect(service.getFavorites().map((c) => c.label)).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
    ]);
  });

  it('shows favorites regardless of the visible category setting', async () => {
    __mockState.configuration['quickCommander.visibleCategories'] = ['window'];
    const service = await createService({
      'quickCommander.favorites': [BROWSER_ID],
    });

    expect(service.getFavorites().map((c) => c.id)).toEqual([BROWSER_ID]);
  });

  it('excludes unavailable commands', async () => {
    __mockState.availableCommands = [];
    const service = await createService({
      'quickCommander.favorites': [BROWSER_ID],
    });

    expect(service.getFavorites()).toEqual([]);
  });

  it('treats an invalid stored value as empty', async () => {
    const service = await createService({
      'quickCommander.favorites': 'invalid',
    });

    expect(service.getFavorites()).toEqual([]);
    expect(service.isFavorite(BROWSER_ID)).toBe(false);
  });

  it('ignores non-string entries in the stored value', async () => {
    const service = await createService({
      'quickCommander.favorites': [BROWSER_ID, 42],
    });

    expect(service.getFavorites().map((c) => c.id)).toEqual([BROWSER_ID]);
  });
});

describe('execution history', () => {
  it('is empty initially', async () => {
    const service = await createService();

    expect(service.getHistory()).toEqual([]);
  });

  it('returns the most recently executed first, not sorted by name', async () => {
    const service = await createService();

    await service.execute(BUILT_IN_COMMANDS[2]);
    await service.execute(BUILT_IN_COMMANDS[0]);

    expect(service.getHistory().map((c) => c.label)).toEqual([
      'Duplicate As Workspace in New Window',
      'Open Integrated Browser',
    ]);
  });

  it('moves a re-executed command to the front (LRU)', async () => {
    const service = await createService();

    await service.execute(BUILT_IN_COMMANDS[0]);
    await service.execute(BUILT_IN_COMMANDS[2]);
    await service.execute(BUILT_IN_COMMANDS[0]);

    expect(service.getHistory().map((c) => c.id)).toEqual([
      DUPLICATE_ID,
      BROWSER_ID,
    ]);
  });

  it('does not keep more entries than historyLimit', async () => {
    __mockState.configuration['quickCommander.historyLimit'] = 2;
    const service = await createService();

    await service.execute(BUILT_IN_COMMANDS[0]);
    await service.execute(BUILT_IN_COMMANDS[1]);
    await service.execute(BUILT_IN_COMMANDS[2]);

    expect(service.getHistory().map((c) => c.id)).toEqual([
      BROWSER_ID,
      MERGE_ID,
    ]);
  });

  it('excludes history entries for unknown command IDs', async () => {
    const service = await createService({
      'quickCommander.history': ['test.removed', BROWSER_ID],
    });

    expect(service.getHistory().map((c) => c.id)).toEqual([BROWSER_ID]);
  });

  it('excludes history entries for unavailable commands', async () => {
    __mockState.availableCommands = [];
    const service = await createService({
      'quickCommander.history': [BROWSER_ID],
    });

    expect(service.getHistory()).toEqual([]);
  });

  it('treats an invalid stored value as empty', async () => {
    const service = await createService({
      'quickCommander.history': { invalid: true },
    });

    expect(service.getHistory()).toEqual([]);
  });

  it('clears the history', async () => {
    const service = await createService();

    await service.execute(BUILT_IN_COMMANDS[0]);
    expect(service.getHistory()).toHaveLength(1);

    await service.clearHistory();
    expect(service.getHistory()).toEqual([]);
  });
});

describe('execute', () => {
  it('runs the command and records it in the history', async () => {
    const service = await createService();

    expect(await service.execute(BUILT_IN_COMMANDS[0])).toBe(true);
    expect(__mockState.executedCommands).toEqual([
      { command: DUPLICATE_ID, args: [] },
    ]);
    expect(service.getHistory().map((c) => c.id)).toEqual([DUPLICATE_ID]);
  });

  it('passes the configured args to the command', async () => {
    const service = await createService();
    const definition: CommandDefinition = {
      id: 'test.withArgs',
      label: 'With Args',
      category: CommandCategory.Custom,
      args: ['foo', 1],
    };

    await service.execute(definition);

    expect(__mockState.executedCommands).toEqual([
      { command: 'test.withArgs', args: ['foo', 1] },
    ]);
  });

  it('runs a confirm command after the confirmation', async () => {
    const service = await createService();
    const definition: CommandDefinition = {
      id: 'test.confirm',
      label: 'Confirm',
      category: CommandCategory.Custom,
      confirm: true,
    };

    __mockState.warningAnswer = 'Run';
    expect(await service.execute(definition)).toBe(true);
    expect(__mockState.executedCommands).toHaveLength(1);
    expect(__mockState.warningMessages[0]).toContain('Confirm');
  });

  it('does not run a confirm command when cancelled', async () => {
    const service = await createService();
    const definition: CommandDefinition = {
      id: 'test.confirm',
      label: 'Confirm',
      category: CommandCategory.Custom,
      confirm: true,
    };

    __mockState.warningAnswer = undefined;
    expect(await service.execute(definition)).toBe(false);
    expect(__mockState.executedCommands).toHaveLength(0);
    expect(service.getHistory()).toEqual([]);
  });

  it('shows an error and skips the history when execution fails', async () => {
    const service = await createService();
    __mockState.executeErrors[DUPLICATE_ID] = new Error('boom');

    expect(await service.execute(BUILT_IN_COMMANDS[0])).toBe(false);
    expect(__mockState.errorMessages[0]).toContain('boom');
    expect(service.getHistory()).toEqual([]);
  });

  it('stringifies non-Error values thrown during execution', async () => {
    const service = await createService();
    __mockState.executeErrors[DUPLICATE_ID] = 'plain failure';

    expect(await service.execute(BUILT_IN_COMMANDS[0])).toBe(false);
    expect(__mockState.errorMessages[0]).toContain('plain failure');
  });
});
