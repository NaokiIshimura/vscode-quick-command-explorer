import * as vscode from 'vscode';
import { CONFIGURATION_SECTION, CommandService } from './commandService';
import { CommandTreeItem } from './quickCommanderTreeItem';
import { QuickCommanderViewProvider } from './quickCommanderViewProvider';
import { CommandDefinition } from './types';

/**
 * Called when the extension is activated.
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Quick Command Explorer extension is now active');

  // Create the command service
  const commandService = new CommandService(context.globalState);

  // Create the tree data provider
  const viewProvider = new QuickCommanderViewProvider(commandService);

  // Create and register the tree view
  const treeView = vscode.window.createTreeView('quickCommander', {
    treeDataProvider: viewProvider,
    showCollapseAll: false,
  });

  // Load the registered command list before the first render
  commandService
    .refreshAvailableCommands()
    .then(() => viewProvider.refresh())
    .catch((error) => {
      console.error('Quick Command Explorer: failed to load command list', error);
      viewProvider.refresh();
    });

  // Register the execute command (invoked when a tree item is clicked)
  const executeCommand = vscode.commands.registerCommand(
    'quickCommander.execute',
    async (definition: CommandDefinition) => {
      const executed = await commandService.execute(definition);

      if (executed) {
        viewProvider.refresh();
      }
    }
  );

  // Register the refresh command
  const refreshCommand = vscode.commands.registerCommand(
    'quickCommander.refresh',
    async () => {
      await commandService.refreshAvailableCommands();
      viewProvider.refresh();
    }
  );

  // Register the search command (quick search through a QuickPick)
  const searchCommand = vscode.commands.registerCommand(
    'quickCommander.search',
    async () => {
      const commands = commandService.getVisibleCommands();

      if (commands.length === 0) {
        vscode.window.showInformationMessage(
          'Quick Command Explorer: no commands to show'
        );
        return;
      }

      const picked = await vscode.window.showQuickPick(
        commands.map((command) => ({
          label: command.label,
          description: command.id,
          detail: command.description,
          definition: command,
        })),
        { placeHolder: 'Search and run a command' }
      );

      if (picked) {
        await vscode.commands.executeCommand(
          'quickCommander.execute',
          picked.definition
        );
      }
    }
  );

  // Register the openSettings command
  const openSettingsCommand = vscode.commands.registerCommand(
    'quickCommander.openSettings',
    () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        CONFIGURATION_SECTION
      );
    }
  );

  // Register the toggleFavorite command
  const toggleFavoriteCommand = vscode.commands.registerCommand(
    'quickCommander.toggleFavorite',
    async (item: CommandTreeItem) => {
      const registered = await commandService.toggleFavorite(
        item.definition.id
      );
      viewProvider.refresh();
      vscode.window.showInformationMessage(
        registered
          ? `Added to favorites: ${item.definition.label}`
          : `Removed from favorites: ${item.definition.label}`
      );
    }
  );

  // Register the copyCommandId command
  const copyCommandIdCommand = vscode.commands.registerCommand(
    'quickCommander.copyCommandId',
    async (item: CommandTreeItem) => {
      await vscode.env.clipboard.writeText(item.definition.id);
      vscode.window.showInformationMessage(
        `Copied command ID: ${item.definition.id}`
      );
    }
  );

  // Register the clearHistory command
  const clearHistoryCommand = vscode.commands.registerCommand(
    'quickCommander.clearHistory',
    async () => {
      await commandService.clearHistory();
      viewProvider.refresh();
    }
  );

  // Refresh the tree when the configuration changes
  const configurationListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration(CONFIGURATION_SECTION)) {
        viewProvider.refresh();
      }
    }
  );

  // Register with the context so everything is cleaned up on deactivation
  context.subscriptions.push(treeView);
  context.subscriptions.push(executeCommand);
  context.subscriptions.push(refreshCommand);
  context.subscriptions.push(searchCommand);
  context.subscriptions.push(openSettingsCommand);
  context.subscriptions.push(toggleFavoriteCommand);
  context.subscriptions.push(copyCommandIdCommand);
  context.subscriptions.push(clearHistoryCommand);
  context.subscriptions.push(configurationListener);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
  console.log('Quick Command Explorer extension is now deactivated');
}
