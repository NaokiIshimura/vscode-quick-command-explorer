import { beforeEach, describe, expect, it } from 'vitest';
import { __mockState, __resetMock } from './__mocks__/vscode';
import {
  INTEGRATED_BROWSER_COMMAND_ID,
  MOVE_EDITOR_TO_RIGHT_GROUP_COMMAND_ID,
} from '../commandCatalog';
import { openIntegratedBrowserInRightGroup } from '../integratedBrowserService';

beforeEach(() => {
  __resetMock();
});

describe('openIntegratedBrowserInRightGroup', () => {
  it('opens the browser and then moves it to the right group', async () => {
    await openIntegratedBrowserInRightGroup();

    expect(__mockState.executedCommands.map((entry) => entry.command)).toEqual([
      INTEGRATED_BROWSER_COMMAND_ID,
      MOVE_EDITOR_TO_RIGHT_GROUP_COMMAND_ID,
    ]);
  });

  it('opens the browser without arguments', async () => {
    await openIntegratedBrowserInRightGroup();

    expect(__mockState.executedCommands[0].args).toEqual([]);
  });

  it('does not move anything when opening the browser fails', async () => {
    __mockState.executeErrors[INTEGRATED_BROWSER_COMMAND_ID] = new Error(
      'no browser'
    );

    await expect(openIntegratedBrowserInRightGroup()).rejects.toThrow(
      'no browser'
    );
    expect(__mockState.executedCommands.map((entry) => entry.command)).toEqual([
      INTEGRATED_BROWSER_COMMAND_ID,
    ]);
  });

  it('propagates a failure of the move command', async () => {
    __mockState.executeErrors[MOVE_EDITOR_TO_RIGHT_GROUP_COMMAND_ID] = new Error(
      'no editor'
    );

    await expect(openIntegratedBrowserInRightGroup()).rejects.toThrow(
      'no editor'
    );
  });
});
