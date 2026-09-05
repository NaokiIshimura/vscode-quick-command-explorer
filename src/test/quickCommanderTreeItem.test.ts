import { describe, expect, it } from 'vitest';
import { ThemeIcon, TreeItemCollapsibleState } from './__mocks__/vscode';
import {
  CategoryTreeItem,
  CommandTreeItem,
  SectionTreeItem,
} from '../quickCommanderTreeItem';
import { CommandCategory, CommandDefinition, SectionKind, TreeNodeKind } from '../types';

const DEFINITION: CommandDefinition = {
  id: 'workbench.action.browser.open',
  label: 'Open Integrated Browser',
  category: CommandCategory.Browser,
  description: 'Open the integrated browser',
  icon: 'globe',
};

describe('CommandTreeItem', () => {
  it('maps the command definition onto the tree item', () => {
    const item = new CommandTreeItem(DEFINITION, false, true);

    expect(item.kind).toBe(TreeNodeKind.Command);
    expect(item.label).toBe('Open Integrated Browser');
    expect(item.description).toBe('workbench.action.browser.open');
    expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
    expect((item.iconPath as ThemeIcon).id).toBe('globe');
    expect(item.contextValue).toBe('command');
  });

  it('carries a command that runs quickCommander.execute on click', () => {
    const item = new CommandTreeItem(DEFINITION, false, true);

    expect(item.command).toEqual({
      command: 'quickCommander.execute',
      title: 'Open Integrated Browser',
      arguments: [DEFINITION],
    });
  });

  it('switches contextValue when the command is a favorite', () => {
    const item = new CommandTreeItem(DEFINITION, true, true);

    expect(item.contextValue).toBe('favoriteCommand');
  });

  it('falls back to the default icon when none is given', () => {
    const item = new CommandTreeItem(
      { ...DEFINITION, icon: undefined },
      false,
      true
    );

    expect((item.iconPath as ThemeIcon).id).toBe('play');
  });

  it('shows a warning icon and note when the command is unavailable', () => {
    const item = new CommandTreeItem(DEFINITION, false, false);

    expect((item.iconPath as ThemeIcon).id).toBe('warning');
    expect(item.tooltip).toContain('not available');
  });

  it('includes the name, description, ID and category in the tooltip', () => {
    const item = new CommandTreeItem(DEFINITION, false, true);

    expect(item.tooltip).toBe(
      [
        'Open Integrated Browser',
        'Open the integrated browser',
        'ID: workbench.action.browser.open',
        'Category: Browser',
      ].join('\n')
    );
  });

  it('omits the description line from the tooltip when there is none', () => {
    const item = new CommandTreeItem(
      { ...DEFINITION, description: undefined },
      false,
      true
    );

    expect(item.tooltip).toBe(
      [
        'Open Integrated Browser',
        'ID: workbench.action.browser.open',
        'Category: Browser',
      ].join('\n')
    );
  });
});

describe('SectionTreeItem', () => {
  it('creates the Favorites section', () => {
    const item = new SectionTreeItem(SectionKind.Favorites);

    expect(item.kind).toBe(TreeNodeKind.Section);
    expect(item.section).toBe(SectionKind.Favorites);
    expect(item.label).toBe('Favorites');
    expect(item.contextValue).toBe('favoritesSection');
    expect((item.iconPath as ThemeIcon).id).toBe('star-full');
    expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
  });

  it('creates the Recently Used section', () => {
    const item = new SectionTreeItem(SectionKind.Recent);

    expect(item.label).toBe('Recently Used');
    expect(item.contextValue).toBe('recentSection');
    expect((item.iconPath as ThemeIcon).id).toBe('history');
    expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
  });
});

describe('CategoryTreeItem', () => {
  it('creates a category heading', () => {
    const item = new CategoryTreeItem(CommandCategory.Window);

    expect(item.kind).toBe(TreeNodeKind.Category);
    expect(item.category).toBe(CommandCategory.Window);
    expect(item.label).toBe('Window');
    expect(item.contextValue).toBe('category');
    expect((item.iconPath as ThemeIcon).id).toBe('multiple-windows');
    expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Expanded);
  });
});
