import * as vscode from 'vscode';
import { CommandService } from './commandService';
import {
  CategoryTreeItem,
  CommandTreeItem,
  QuickCommanderTreeItem,
  SectionTreeItem,
} from './quickCommanderTreeItem';
import {
  CATEGORY_ORDER,
  CommandDefinition,
  SectionKind,
  TreeNodeKind,
} from './types';

/**
 * TreeDataProvider implementation for Quick Commander.
 *
 * By default it renders a flat single-level list sorted by command name in
 * ascending order. It switches to a two-level category tree only when the
 * quickCommander.groupByCategory setting is enabled.
 */
export class QuickCommanderViewProvider
  implements vscode.TreeDataProvider<QuickCommanderTreeItem>
{
  private readonly onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<QuickCommanderTreeItem | undefined>();

  /** Tree refresh event */
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  /**
   * @param commandService Command service
   */
  constructor(private readonly commandService: CommandService) {}

  /**
   * Redraws the tree.
   */
  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /**
   * Returns the tree item for a node.
   * @param element Tree node
   * @returns Tree item
   */
  getTreeItem(element: QuickCommanderTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Returns the child nodes.
   * @param element Parent node, or undefined for the root
   * @returns Child nodes
   */
  getChildren(element?: QuickCommanderTreeItem): QuickCommanderTreeItem[] {
    if (!element) {
      return this.getRootChildren();
    }

    if (element.kind === TreeNodeKind.Section) {
      return this.getSectionChildren(element.section);
    }

    if (element.kind === TreeNodeKind.Category) {
      return this.toCommandTreeItems(
        this.commandService.getVisibleCommandsByCategory(element.category)
      );
    }

    return [];
  }

  /**
   * Returns the nodes directly under the root.
   * @returns Sections followed by commands (or categories)
   */
  private getRootChildren(): QuickCommanderTreeItem[] {
    const children: QuickCommanderTreeItem[] = [];

    if (
      this.commandService.isShowFavoritesSection() &&
      this.commandService.getFavorites().length > 0
    ) {
      children.push(new SectionTreeItem(SectionKind.Favorites));
    }

    if (
      this.commandService.isShowRecentSection() &&
      this.commandService.getHistory().length > 0
    ) {
      children.push(new SectionTreeItem(SectionKind.Recent));
    }

    if (this.commandService.isGroupByCategory()) {
      CATEGORY_ORDER.forEach((category) => {
        if (
          this.commandService.getVisibleCommandsByCategory(category).length > 0
        ) {
          children.push(new CategoryTreeItem(category));
        }
      });

      return children;
    }

    return [
      ...children,
      ...this.toCommandTreeItems(this.commandService.getVisibleCommands()),
    ];
  }

  /**
   * Returns the nodes under a section.
   * @param section Section kind
   * @returns Command nodes
   */
  private getSectionChildren(section: SectionKind): QuickCommanderTreeItem[] {
    const commands =
      section === SectionKind.Favorites
        ? this.commandService.getFavorites()
        : this.commandService.getHistory();

    return this.toCommandTreeItems(commands);
  }

  /**
   * Converts command definitions into tree items.
   * @param commands Command definitions
   * @returns Command tree items
   */
  private toCommandTreeItems(
    commands: readonly CommandDefinition[]
  ): CommandTreeItem[] {
    return commands.map(
      (command) =>
        new CommandTreeItem(
          command,
          this.commandService.isFavorite(command.id),
          this.commandService.isAvailable(command) &&
            this.commandService.isSupportedPlatform(command)
        )
    );
  }
}
