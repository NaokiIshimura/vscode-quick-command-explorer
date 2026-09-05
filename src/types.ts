/**
 * Command category.
 * The enum values double as the strings used in the
 * quickCommander.visibleCategories setting.
 */
export enum CommandCategory {
  /** Browser related */
  Browser = 'browser',
  /** Workspace related */
  Workspace = 'workspace',
  /** Window related */
  Window = 'window',
  /** Commands added by the user through settings */
  Custom = 'custom',
}

/**
 * Section headings shown at the top of the tree.
 * Sections are a different axis from categories, so they get their own enum.
 */
export enum SectionKind {
  /** Favorites */
  Favorites = 'favorites',
  /** Recently used commands */
  Recent = 'recent',
}

/**
 * Kind of a tree node.
 */
export enum TreeNodeKind {
  /** Section heading (Favorites / Recently Used) */
  Section = 'section',
  /** Category heading (only when groupByCategory is enabled) */
  Category = 'category',
  /** Command */
  Command = 'command',
}

/**
 * Definition of a command.
 */
export interface CommandDefinition {
  /** VSCode command ID */
  readonly id: string;
  /** Display name. Also the sort key */
  readonly label: string;
  /** Category the command belongs to */
  readonly category: CommandCategory;
  /** Additional explanation shown in the tooltip */
  readonly description?: string;
  /** ThemeIcon ID */
  readonly icon?: string;
  /** Arguments passed when the command is executed */
  readonly args?: readonly unknown[];
  /** Platforms the command runs on (process.platform values). All platforms when omitted */
  readonly platforms?: readonly string[];
  /**
   * Command IDs that must also be registered in VSCode.
   * Used by commands this extension contributes itself, because their own ID
   * is always registered and says nothing about what they depend on
   */
  readonly requires?: readonly string[];
  /** Whether to show a confirmation dialog before executing */
  readonly confirm?: boolean;
}

/**
 * Compares commands by their label in ascending order.
 *
 * The locale is pinned to 'en' so the result does not depend on the runtime
 * locale. Case is ignored (sensitivity: 'base') and numbers are compared
 * naturally (numeric: true). When two commands share a label, the command ID
 * is used as a secondary key so the order stays deterministic.
 *
 * @param a Left-hand command definition
 * @param b Right-hand command definition
 * @returns Negative if a comes first, positive if b comes first, 0 if equal
 */
export function compareCommandsByLabel(
  a: CommandDefinition,
  b: CommandDefinition
): number {
  const byLabel = a.label.localeCompare(b.label, 'en', {
    sensitivity: 'base',
    numeric: true,
  });

  return byLabel !== 0 ? byLabel : a.id.localeCompare(b.id, 'en');
}

/**
 * Converts a CommandCategory enum value to its settings string.
 * @param category CommandCategory enum value
 * @returns Settings string
 */
export function categoryToString(category: CommandCategory): string {
  return category;
}

/**
 * Converts a settings string to a CommandCategory enum value.
 * Unknown values are treated as Custom.
 * @param value Settings string
 * @returns CommandCategory enum value
 */
export function stringToCategory(value: string): CommandCategory {
  switch (value) {
    case CommandCategory.Browser:
      return CommandCategory.Browser;
    case CommandCategory.Workspace:
      return CommandCategory.Workspace;
    case CommandCategory.Window:
      return CommandCategory.Window;
    case CommandCategory.Custom:
    default:
      return CommandCategory.Custom;
  }
}

/**
 * Returns the display label of a category.
 * @param category CommandCategory enum value
 * @returns Display label
 */
export function getCategoryLabel(category: CommandCategory): string {
  switch (category) {
    case CommandCategory.Browser:
      return 'Browser';
    case CommandCategory.Workspace:
      return 'Workspace';
    case CommandCategory.Window:
      return 'Window';
    case CommandCategory.Custom:
      return 'Custom';
  }
}

/**
 * Returns the ThemeIcon ID of a category.
 * @param category CommandCategory enum value
 * @returns ThemeIcon ID
 */
export function getCategoryIcon(category: CommandCategory): string {
  switch (category) {
    case CommandCategory.Browser:
      return 'globe';
    case CommandCategory.Workspace:
      return 'folder-library';
    case CommandCategory.Window:
      return 'multiple-windows';
    case CommandCategory.Custom:
      return 'tools';
  }
}

/**
 * Display order of the category headings when groupByCategory is enabled.
 */
export const CATEGORY_ORDER: readonly CommandCategory[] = [
  CommandCategory.Browser,
  CommandCategory.Workspace,
  CommandCategory.Window,
  CommandCategory.Custom,
];

/**
 * Returns the display label of a section.
 * @param section SectionKind enum value
 * @returns Display label
 */
export function getSectionLabel(section: SectionKind): string {
  switch (section) {
    case SectionKind.Favorites:
      return 'Favorites';
    case SectionKind.Recent:
      return 'Recently Used';
  }
}

/**
 * Returns the ThemeIcon ID of a section.
 * @param section SectionKind enum value
 * @returns ThemeIcon ID
 */
export function getSectionIcon(section: SectionKind): string {
  switch (section) {
    case SectionKind.Favorites:
      return 'star-full';
    case SectionKind.Recent:
      return 'history';
  }
}
