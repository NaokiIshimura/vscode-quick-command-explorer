import {
  CommandCategory,
  CommandDefinition,
  compareCommandsByLabel,
} from './types';

/**
 * Built-in command definitions.
 *
 * Listed in ascending order by command name (label). The actual display order
 * is guaranteed by getSortedCommands(), but the declaration order is kept in
 * sync for readability.
 */
export const BUILT_IN_COMMANDS: readonly CommandDefinition[] = [
  {
    id: 'workbench.action.duplicateWorkspaceInNewWindow',
    label: 'Duplicate As Workspace in New Window',
    category: CommandCategory.Workspace,
    description: 'Duplicate the current workspace in a new window',
    icon: 'empty-window',
  },
  {
    id: 'workbench.action.mergeAllWindowTabs',
    label: 'Merge All Windows',
    category: CommandCategory.Window,
    description: 'Merge all windows into one (macOS only)',
    icon: 'multiple-windows',
    platforms: ['darwin'],
  },
  {
    id: 'workbench.action.browser.open',
    label: 'Open Integrated Browser',
    category: CommandCategory.Browser,
    description: 'Open the integrated browser',
    icon: 'globe',
  },
];

/**
 * Returns a new array sorted by command name in ascending order.
 * The given array is never mutated.
 * @param commands Commands to sort
 * @returns New array sorted by command name
 */
export function getSortedCommands(
  commands: readonly CommandDefinition[]
): CommandDefinition[] {
  return [...commands].sort(compareCommandsByLabel);
}

/**
 * Looks up a built-in command definition by its command ID.
 * @param id Command ID
 * @returns The matching command definition, or undefined when not found
 */
export function findCommandById(id: string): CommandDefinition | undefined {
  return BUILT_IN_COMMANDS.find((command) => command.id === id);
}

/**
 * Returns the built-in commands of a category, sorted by command name.
 * @param category Category
 * @returns Matching command definitions
 */
export function getCommandsByCategory(
  category: CommandCategory
): CommandDefinition[] {
  return getSortedCommands(
    BUILT_IN_COMMANDS.filter((command) => command.category === category)
  );
}
