import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  CommandCategory,
  CommandDefinition,
  SectionKind,
  categoryToString,
  compareCommandsByLabel,
  getCategoryIcon,
  getCategoryLabel,
  getSectionIcon,
  getSectionLabel,
  stringToCategory,
} from '../types';

/**
 * Creates a command definition for testing.
 */
function createCommand(
  label: string,
  id = `test.${label}`,
  category = CommandCategory.Custom
): CommandDefinition {
  return { id, label, category };
}

describe('compareCommandsByLabel', () => {
  it('compares by command name in ascending order', () => {
    const a = createCommand('Apple');
    const b = createCommand('Banana');

    expect(compareCommandsByLabel(a, b)).toBeLessThan(0);
    expect(compareCommandsByLabel(b, a)).toBeGreaterThan(0);
  });

  it('ignores case when comparing', () => {
    const upper = createCommand('APPLE', 'test.upper');
    const lower = createCommand('apple', 'test.lower');

    expect(
      upper.label.localeCompare(lower.label, 'en', { sensitivity: 'base' })
    ).toBe(0);
    // Equal by label, so the command ID is used as the secondary key
    expect(compareCommandsByLabel(upper, lower)).toBeGreaterThan(0);
  });

  it('compares names containing numbers naturally', () => {
    const second = createCommand('Item 2');
    const tenth = createCommand('Item 10');

    expect(compareCommandsByLabel(second, tenth)).toBeLessThan(0);
  });

  it('falls back to the command ID when labels are equal', () => {
    const a = createCommand('Same', 'test.a');
    const b = createCommand('Same', 'test.b');

    expect(compareCommandsByLabel(a, b)).toBeLessThan(0);
    expect(compareCommandsByLabel(b, a)).toBeGreaterThan(0);
    expect(compareCommandsByLabel(a, a)).toBe(0);
  });

  it('sorts the three built-in command names in ascending order', () => {
    const commands = [
      createCommand('Open Integrated Browser'),
      createCommand('Merge All Windows'),
      createCommand('Duplicate As Workspace in New Window'),
    ];

    expect([...commands].sort(compareCommandsByLabel).map((c) => c.label)).toEqual(
      [
        'Duplicate As Workspace in New Window',
        'Merge All Windows',
        'Open Integrated Browser',
      ]
    );
  });
});

describe('categoryToString', () => {
  it('returns the enum value as the settings string', () => {
    expect(categoryToString(CommandCategory.Browser)).toBe('browser');
    expect(categoryToString(CommandCategory.Workspace)).toBe('workspace');
    expect(categoryToString(CommandCategory.Window)).toBe('window');
    expect(categoryToString(CommandCategory.Custom)).toBe('custom');
  });
});

describe('stringToCategory', () => {
  it('converts a settings string into an enum value', () => {
    expect(stringToCategory('browser')).toBe(CommandCategory.Browser);
    expect(stringToCategory('workspace')).toBe(CommandCategory.Workspace);
    expect(stringToCategory('window')).toBe(CommandCategory.Window);
    expect(stringToCategory('custom')).toBe(CommandCategory.Custom);
  });

  it('treats unknown values as Custom', () => {
    expect(stringToCategory('unknown')).toBe(CommandCategory.Custom);
  });
});

describe('getCategoryLabel', () => {
  it('returns the display label of every category', () => {
    expect(getCategoryLabel(CommandCategory.Browser)).toBe('Browser');
    expect(getCategoryLabel(CommandCategory.Workspace)).toBe('Workspace');
    expect(getCategoryLabel(CommandCategory.Window)).toBe('Window');
    expect(getCategoryLabel(CommandCategory.Custom)).toBe('Custom');
  });
});

describe('getCategoryIcon', () => {
  it('returns the ThemeIcon ID of every category', () => {
    expect(getCategoryIcon(CommandCategory.Browser)).toBe('globe');
    expect(getCategoryIcon(CommandCategory.Workspace)).toBe('folder-library');
    expect(getCategoryIcon(CommandCategory.Window)).toBe('multiple-windows');
    expect(getCategoryIcon(CommandCategory.Custom)).toBe('tools');
  });
});

describe('CATEGORY_ORDER', () => {
  it('contains every category exactly once', () => {
    expect([...CATEGORY_ORDER].sort()).toEqual(
      [...Object.values(CommandCategory)].sort()
    );
  });
});

describe('getSectionLabel', () => {
  it('returns the display label of every section', () => {
    expect(getSectionLabel(SectionKind.Favorites)).toBe('Favorites');
    expect(getSectionLabel(SectionKind.Recent)).toBe('Recently Used');
  });
});

describe('getSectionIcon', () => {
  it('returns the ThemeIcon ID of every section', () => {
    expect(getSectionIcon(SectionKind.Favorites)).toBe('star-full');
    expect(getSectionIcon(SectionKind.Recent)).toBe('history');
  });
});
