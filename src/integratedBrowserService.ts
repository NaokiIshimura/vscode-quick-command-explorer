import * as vscode from 'vscode';
import {
  INTEGRATED_BROWSER_COMMAND_ID,
  MOVE_EDITOR_TO_RIGHT_GROUP_COMMAND_ID,
} from './commandCatalog';

/**
 * Opens the integrated browser and puts it in the editor group on the right.
 *
 * The integrated browser opens in the active editor group, which covers the
 * code that is already open. Moving the editor afterwards leaves the code in
 * the left group and the browser in a split on the right.
 *
 * The move targets the active editor, so it runs only once opening the browser
 * has resolved. Failures are left to the caller: CommandService.execute()
 * already turns a rejected command into an error notification.
 */
export async function openIntegratedBrowserInRightGroup(): Promise<void> {
  await vscode.commands.executeCommand(INTEGRATED_BROWSER_COMMAND_ID);
  await vscode.commands.executeCommand(MOVE_EDITOR_TO_RIGHT_GROUP_COMMAND_ID);
}
