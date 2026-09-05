import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __createMemento, __mockState, __resetMock } from './__mocks__/vscode';
import { CommandService } from '../commandService';
import { QuickCommanderViewProvider } from '../quickCommanderViewProvider';
import {
  CategoryTreeItem,
  CommandTreeItem,
  SectionTreeItem,
} from '../quickCommanderTreeItem';
import { BUILT_IN_COMMANDS } from '../commandCatalog';
import { SectionKind } from '../types';

const BROWSER_ID = 'workbench.action.browser.open';
const DUPLICATE_ID = 'workbench.action.duplicateWorkspaceInNewWindow';
const MERGE_ID = 'workbench.action.mergeAllWindowTabs';

const ALL_BUILT_IN_IDS = BUILT_IN_COMMANDS.map((command) => command.id);

let originalPlatform: PropertyDescriptor | undefined;

/**
 * Creates the service and the provider.
 */
async function createProvider(
  initialState: Record<string, unknown> = {}
): Promise<{ service: CommandService; provider: QuickCommanderViewProvider }> {
  const service = new CommandService(__createMemento(initialState) as never);
  await service.refreshAvailableCommands();

  return { service, provider: new QuickCommanderViewProvider(service) };
}

/**
 * Extracts the labels of the given nodes.
 */
function labelsOf(items: { label?: string }[]): (string | undefined)[] {
  return items.map((item) => item.label);
}

beforeEach(() => {
  __resetMock();
  __mockState.availableCommands = [...ALL_BUILT_IN_IDS];
  originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    configurable: true,
  });
});

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform);
  }
});

describe('getTreeItem', () => {
  it('returns the given node as is', async () => {
    const { provider } = await createProvider();
    const item = new SectionTreeItem(SectionKind.Favorites);

    expect(provider.getTreeItem(item)).toBe(item);
  });
});

describe('refresh', () => {
  it('fires the refresh event', async () => {
    const { provider } = await createProvider();
    let fired = false;

    provider.onDidChangeTreeData(() => {
      fired = true;
    });
    provider.refresh();

    expect(fired).toBe(true);
  });
});

describe('root (flat view)', () => {
  it('returns a flat list sorted by command name', async () => {
    const { provider } = await createProvider();
    const children = provider.getChildren();

    expect(children.every((child) => child instanceof CommandTreeItem)).toBe(
      true
    );
    expect(labelsOf(children)).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
    ]);
  });

  it('shows the Favorites section first when there are favorites', async () => {
    const { provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID],
    });
    const children = provider.getChildren();

    expect(children[0]).toBeInstanceOf(SectionTreeItem);
    expect(children[0].label).toBe('Favorites');
    expect(children).toHaveLength(4);
  });

  it('shows the Recently Used section when there is history', async () => {
    const { service, provider } = await createProvider();
    await service.execute(BUILT_IN_COMMANDS[0]);
    const children = provider.getChildren();

    expect(children[0].label).toBe('Recently Used');
  });

  it('shows Favorites before Recently Used', async () => {
    const { service, provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID],
    });
    await service.execute(BUILT_IN_COMMANDS[0]);

    expect(labelsOf(provider.getChildren()).slice(0, 2)).toEqual([
      'Favorites',
      'Recently Used',
    ]);
  });

  it('hides the sections when favorites and history are empty', async () => {
    const { provider } = await createProvider();

    expect(
      provider.getChildren().some((child) => child instanceof SectionTreeItem)
    ).toBe(false);
  });

  it('hides sections disabled through the settings', async () => {
    __mockState.configuration['quickCommander.showFavoritesSection'] = false;
    __mockState.configuration['quickCommander.showRecentSection'] = false;
    const { service, provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID],
    });
    await service.execute(BUILT_IN_COMMANDS[0]);

    expect(
      provider.getChildren().some((child) => child instanceof SectionTreeItem)
    ).toBe(false);
  });

  it('keeps the ascending order with custom commands included', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: 'test.zen', label: 'Zen Mode' },
      { id: 'test.add', label: 'Add Folder to Workspace' },
    ];
    __mockState.availableCommands = [
      ...ALL_BUILT_IN_IDS,
      'test.zen',
      'test.add',
    ];
    const { provider } = await createProvider();

    expect(labelsOf(provider.getChildren())).toEqual([
      'Add Folder to Workspace',
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
      'Zen Mode',
    ]);
  });

  it('hides Merge All Windows outside macOS', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    const { provider } = await createProvider();

    expect(labelsOf(provider.getChildren())).toEqual([
      'Duplicate As Workspace in New Window',
      'Open Integrated Browser',
    ]);
  });

  it('hides unregistered commands', async () => {
    __mockState.availableCommands = [BROWSER_ID];
    const { provider } = await createProvider();

    expect(labelsOf(provider.getChildren())).toEqual([
      'Open Integrated Browser',
    ]);
  });

  it('shows unavailable commands when showUnavailableCommands is enabled', async () => {
    __mockState.availableCommands = [];
    __mockState.configuration['quickCommander.showUnavailableCommands'] = true;
    const { provider } = await createProvider();
    const children = provider.getChildren() as CommandTreeItem[];

    expect(children).toHaveLength(3);
    expect(children.every((child) => child.isAvailable === false)).toBe(true);
  });
});

describe('root (category view)', () => {
  beforeEach(() => {
    __mockState.configuration['quickCommander.groupByCategory'] = true;
  });

  it('shows only the categories that have commands', async () => {
    const { provider } = await createProvider();
    const children = provider.getChildren();

    expect(children.every((child) => child instanceof CategoryTreeItem)).toBe(
      true
    );
    expect(labelsOf(children)).toEqual(['Browser', 'Workspace', 'Window']);
  });

  it('shows the sections before the categories', async () => {
    const { provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID],
    });

    expect(labelsOf(provider.getChildren())).toEqual([
      'Favorites',
      'Browser',
      'Workspace',
      'Window',
    ]);
  });

  it('returns the commands under a category', async () => {
    const { provider } = await createProvider();
    const category = new CategoryTreeItem(
      (provider.getChildren()[0] as CategoryTreeItem).category
    );

    expect(labelsOf(provider.getChildren(category))).toEqual([
      'Open Integrated Browser',
    ]);
  });

  it('adds the Custom category and sorts its commands ascending', async () => {
    __mockState.configuration['quickCommander.customCommands'] = [
      { id: 'test.zen', label: 'Zen Mode' },
      { id: 'test.add', label: 'Add Folder to Workspace' },
    ];
    __mockState.availableCommands = [
      ...ALL_BUILT_IN_IDS,
      'test.zen',
      'test.add',
    ];
    const { provider } = await createProvider();
    const children = provider.getChildren() as CategoryTreeItem[];

    expect(labelsOf(children)).toEqual([
      'Browser',
      'Workspace',
      'Window',
      'Custom',
    ]);
    expect(labelsOf(provider.getChildren(children[3]))).toEqual([
      'Add Folder to Workspace',
      'Zen Mode',
    ]);
  });
});

describe('section children', () => {
  it('returns the Favorites children sorted by command name', async () => {
    const { provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID, DUPLICATE_ID, MERGE_ID],
    });
    const section = new SectionTreeItem(SectionKind.Favorites);

    expect(labelsOf(provider.getChildren(section))).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
    ]);
  });

  it('marks the Favorites children as favorites', async () => {
    const { provider } = await createProvider({
      'quickCommander.favorites': [BROWSER_ID],
    });
    const children = provider.getChildren(
      new SectionTreeItem(SectionKind.Favorites)
    ) as CommandTreeItem[];

    expect(children[0].isFavorite).toBe(true);
    expect(children[0].contextValue).toBe('favoriteCommand');
  });

  it('returns the Recently Used children most recently executed first', async () => {
    const { service, provider } = await createProvider();
    await service.execute(BUILT_IN_COMMANDS[2]);
    await service.execute(BUILT_IN_COMMANDS[0]);
    const section = new SectionTreeItem(SectionKind.Recent);

    expect(labelsOf(provider.getChildren(section))).toEqual([
      'Duplicate As Workspace in New Window',
      'Open Integrated Browser',
    ]);
  });
});

describe('command node children', () => {
  it('has no children', async () => {
    const { provider } = await createProvider();
    const command = provider.getChildren()[0];

    expect(provider.getChildren(command)).toEqual([]);
  });
});
