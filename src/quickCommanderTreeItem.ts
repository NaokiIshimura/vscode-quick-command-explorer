import * as vscode from 'vscode';
import {
  CommandCategory,
  CommandDefinition,
  SectionKind,
  TreeNodeKind,
  getCategoryIcon,
  getCategoryLabel,
  getSectionIcon,
  getSectionLabel,
} from './types';

/**
 * Tree item for a section heading (Favorites / Recently Used).
 */
export class SectionTreeItem extends vscode.TreeItem {
  /** Node kind */
  readonly kind = TreeNodeKind.Section;

  /**
   * @param section Section kind
   */
  constructor(readonly section: SectionKind) {
    super(getSectionLabel(section), vscode.TreeItemCollapsibleState.Expanded);

    this.iconPath = new vscode.ThemeIcon(getSectionIcon(section));
    this.contextValue =
      section === SectionKind.Recent ? 'recentSection' : 'favoritesSection';
  }
}

/**
 * Tree item for a category heading.
 * Only used when groupByCategory is enabled.
 */
export class CategoryTreeItem extends vscode.TreeItem {
  /** Node kind */
  readonly kind = TreeNodeKind.Category;

  /**
   * @param category Category
   */
  constructor(readonly category: CommandCategory) {
    super(
      getCategoryLabel(category),
      vscode.TreeItemCollapsibleState.Expanded
    );

    this.iconPath = new vscode.ThemeIcon(getCategoryIcon(category));
    this.contextValue = 'category';
  }
}

/**
 * Tree item for a command.
 * Clicking it runs the quickCommander.execute command.
 */
export class CommandTreeItem extends vscode.TreeItem {
  /** Node kind */
  readonly kind = TreeNodeKind.Command;

  /**
   * @param definition Command definition
   * @param isFavorite Whether the command is registered as a favorite
   * @param isAvailable Whether the command is registered and can run
   */
  constructor(
    readonly definition: CommandDefinition,
    readonly isFavorite: boolean,
    readonly isAvailable: boolean
  ) {
    super(definition.label, vscode.TreeItemCollapsibleState.None);

    this.description = definition.id;
    this.tooltip = buildTooltip(definition, isAvailable);
    this.iconPath = new vscode.ThemeIcon(
      isAvailable ? definition.icon ?? 'play' : 'warning'
    );
    this.contextValue = isFavorite ? 'favoriteCommand' : 'command';
    this.command = {
      command: 'quickCommander.execute',
      title: definition.label,
      arguments: [definition],
    };
  }
}

/**
 * Builds the tooltip text of a command.
 * @param definition Command definition
 * @param isAvailable Whether the command can run
 * @returns Tooltip text
 */
function buildTooltip(
  definition: CommandDefinition,
  isAvailable: boolean
): string {
  const lines = [definition.label];

  if (definition.description) {
    lines.push(definition.description);
  }

  lines.push(`ID: ${definition.id}`);
  lines.push(`Category: ${getCategoryLabel(definition.category)}`);

  if (!isAvailable) {
    lines.push('This command is not available in the current environment');
  }

  return lines.join('\n');
}

/**
 * Node types handled by the Quick Commander tree view.
 */
export type QuickCommanderTreeItem =
  | SectionTreeItem
  | CategoryTreeItem
  | CommandTreeItem;
