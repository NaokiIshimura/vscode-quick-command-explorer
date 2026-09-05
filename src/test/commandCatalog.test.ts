import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_COMMANDS,
  INTEGRATED_BROWSER_COMMAND_ID,
  findCommandById,
  getCommandsByCategory,
  getSortedCommands,
} from '../commandCatalog';
import { CommandCategory, compareCommandsByLabel } from '../types';

describe('BUILT_IN_COMMANDS', () => {
  it('contains five built-in commands', () => {
    expect(BUILT_IN_COMMANDS).toHaveLength(5);
  });

  it('has no duplicate command IDs', () => {
    const ids = BUILT_IN_COMMANDS.map((command) => command.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all required fields on every command', () => {
    BUILT_IN_COMMANDS.forEach((command) => {
      expect(command.id).toBeTruthy();
      expect(command.label).toBeTruthy();
      expect(Object.values(CommandCategory)).toContain(command.category);
      expect(command.description).toBeTruthy();
      expect(command.icon).toBeTruthy();
    });
  });

  it('starts every command ID with a known prefix', () => {
    BUILT_IN_COMMANDS.forEach((command) => {
      expect(
        command.id.startsWith('workbench.action.') ||
          command.id.startsWith('quickCommander.')
      ).toBe(true);
    });
  });

  it('declares the commands in ascending order by command name', () => {
    expect(BUILT_IN_COMMANDS.map((command) => command.label)).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
      'Open Repository on GitHub',
      'Open Repository on GitHub in Integrated Browser',
    ]);
  });

  it('defines the expected command IDs', () => {
    expect(BUILT_IN_COMMANDS.map((command) => command.id)).toEqual([
      'workbench.action.duplicateWorkspaceInNewWindow',
      'workbench.action.mergeAllWindowTabs',
      'workbench.action.browser.open',
      'quickCommander.openRepositoryOnGitHub',
      'quickCommander.openRepositoryOnGitHubInIntegratedBrowser',
    ]);
  });

  it('marks the integrated browser variant as requiring the browser command', () => {
    const command = findCommandById(
      'quickCommander.openRepositoryOnGitHubInIntegratedBrowser'
    );

    expect(command?.requires).toEqual([INTEGRATED_BROWSER_COMMAND_ID]);
  });

  it('marks Merge All Windows as macOS only', () => {
    const command = findCommandById('workbench.action.mergeAllWindowTabs');

    expect(command?.platforms).toEqual(['darwin']);
  });
});

describe('getSortedCommands', () => {
  it('returns an array sorted by command name in ascending order', () => {
    const shuffled = [
      BUILT_IN_COMMANDS[2],
      BUILT_IN_COMMANDS[0],
      BUILT_IN_COMMANDS[1],
    ];

    expect(getSortedCommands(shuffled).map((command) => command.label)).toEqual([
      'Duplicate As Workspace in New Window',
      'Merge All Windows',
      'Open Integrated Browser',
    ]);
  });

  it('does not mutate the given array', () => {
    const original = [
      BUILT_IN_COMMANDS[2],
      BUILT_IN_COMMANDS[0],
      BUILT_IN_COMMANDS[1],
    ];
    const sorted = getSortedCommands(original);

    expect(original[0]).toBe(BUILT_IN_COMMANDS[2]);
    expect(sorted).not.toBe(original);
  });

  it('returns an empty array for an empty input', () => {
    expect(getSortedCommands([])).toEqual([]);
  });

  it('matches the order produced by compareCommandsByLabel', () => {
    expect(getSortedCommands(BUILT_IN_COMMANDS)).toEqual(
      [...BUILT_IN_COMMANDS].sort(compareCommandsByLabel)
    );
  });
});

describe('findCommandById', () => {
  it('finds a definition by an existing command ID', () => {
    const command = findCommandById('workbench.action.browser.open');

    expect(command?.label).toBe('Open Integrated Browser');
  });

  it('returns undefined for an unknown command ID', () => {
    expect(findCommandById('workbench.action.notExists')).toBeUndefined();
  });
});

describe('getCommandsByCategory', () => {
  it('returns the commands of the given category', () => {
    expect(
      getCommandsByCategory(CommandCategory.Browser).map((c) => c.id)
    ).toEqual([
      'workbench.action.browser.open',
      'quickCommander.openRepositoryOnGitHub',
      'quickCommander.openRepositoryOnGitHubInIntegratedBrowser',
    ]);
    expect(
      getCommandsByCategory(CommandCategory.Workspace).map((c) => c.id)
    ).toEqual(['workbench.action.duplicateWorkspaceInNewWindow']);
    expect(
      getCommandsByCategory(CommandCategory.Window).map((c) => c.id)
    ).toEqual(['workbench.action.mergeAllWindowTabs']);
  });

  it('returns an empty array for a category with no commands', () => {
    expect(getCommandsByCategory(CommandCategory.Custom)).toEqual([]);
  });
});
