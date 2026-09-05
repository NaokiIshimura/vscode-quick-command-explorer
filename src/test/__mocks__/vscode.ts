/**
 * Mock of the VSCode API.
 */

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class Uri {
  readonly fsPath: string;
  readonly scheme: string;

  private constructor(fsPath: string) {
    this.fsPath = fsPath;
    this.scheme = 'file';
  }

  static file(path: string): Uri {
    return new Uri(path);
  }
}

export interface Command {
  command: string;
  title: string;
  arguments?: unknown[];
}

export class TreeItem {
  label?: string;
  collapsibleState?: TreeItemCollapsibleState;
  command?: Command;
  contextValue?: string;
  tooltip?: string;
  iconPath?: ThemeIcon | Uri;
  description?: string;

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState ?? TreeItemCollapsibleState.None;
  }
}

export interface Disposable {
  dispose(): void;
}

export class EventEmitter<T> {
  private readonly listeners: ((value: T) => void)[] = [];

  readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.push(listener);

    return { dispose: () => undefined };
  };

  fire(value: T): void {
    this.listeners.forEach((listener) => listener(value));
  }

  dispose(): void {
    this.listeners.length = 0;
  }
}

/**
 * Mock state.
 * Tests call __resetMock() to reset it and then write to the fields
 * directly to control the behaviour.
 */
export const __mockState = {
  /** Setting values, keyed by the full key such as `quickCommander.xxx` */
  configuration: {} as Record<string, unknown>,
  /** Command IDs registered in VSCode */
  availableCommands: [] as string[],
  /** Calls made to executeCommand */
  executedCommands: [] as { command: string; args: unknown[] }[],
  /** Errors thrown by executeCommand, keyed by command ID */
  executeErrors: {} as Record<string, unknown>,
  /** Value returned by showWarningMessage */
  warningAnswer: undefined as string | undefined,
  /** Value returned by showQuickPick */
  quickPickResult: undefined as unknown,
  /** Recorded notification messages */
  infoMessages: [] as string[],
  warningMessages: [] as string[],
  errorMessages: [] as string[],
  /** Clipboard contents */
  clipboardText: '',
};

/**
 * Resets the mock state.
 */
export function __resetMock(): void {
  __mockState.configuration = {};
  __mockState.availableCommands = [];
  __mockState.executedCommands = [];
  __mockState.executeErrors = {};
  __mockState.warningAnswer = undefined;
  __mockState.quickPickResult = undefined;
  __mockState.infoMessages = [];
  __mockState.warningMessages = [];
  __mockState.errorMessages = [];
  __mockState.clipboardText = '';
}

/**
 * Creates a Memento mock.
 * @param initial Initial values
 * @returns A Memento-compatible object
 */
export function __createMemento(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };

  return {
    keys: () => Object.keys(store),
    get: <T>(key: string, defaultValue?: T): T | undefined =>
      (store[key] as T) ?? defaultValue,
    update: async (key: string, value: unknown): Promise<void> => {
      store[key] = value;
    },
    /** Raw store, exposed for assertions */
    __store: store,
  };
}

export const workspace = {
  getConfiguration: (section: string) => ({
    get: <T>(key: string, defaultValue?: T): T | undefined => {
      const fullKey = `${section}.${key}`;

      return fullKey in __mockState.configuration
        ? (__mockState.configuration[fullKey] as T)
        : defaultValue;
    },
  }),
  onDidChangeConfiguration: (
    _listener: (event: { affectsConfiguration(section: string): boolean }) => void
  ): Disposable => ({ dispose: () => undefined }),
};

export const commands = {
  registerCommand: (_command: string, _callback: unknown): Disposable => ({
    dispose: () => undefined,
  }),
  executeCommand: async (command: string, ...args: unknown[]): Promise<void> => {
    __mockState.executedCommands.push({ command, args });

    if (command in __mockState.executeErrors) {
      throw __mockState.executeErrors[command];
    }
  },
  getCommands: async (_filterInternal?: boolean): Promise<string[]> => [
    ...__mockState.availableCommands,
  ],
};

export const window = {
  createTreeView: (_viewId: string, _options: unknown) => ({
    description: undefined as string | undefined,
    dispose: () => undefined,
  }),
  showInformationMessage: (message: string): Promise<undefined> => {
    __mockState.infoMessages.push(message);

    return Promise.resolve(undefined);
  },
  showWarningMessage: (
    message: string,
    ..._rest: unknown[]
  ): Promise<string | undefined> => {
    __mockState.warningMessages.push(message);

    return Promise.resolve(__mockState.warningAnswer);
  },
  showErrorMessage: (message: string): Promise<undefined> => {
    __mockState.errorMessages.push(message);

    return Promise.resolve(undefined);
  },
  showQuickPick: (_items: unknown, _options?: unknown): Promise<unknown> =>
    Promise.resolve(__mockState.quickPickResult),
};

export const env = {
  clipboard: {
    writeText: async (text: string): Promise<void> => {
      __mockState.clipboardText = text;
    },
  },
};
