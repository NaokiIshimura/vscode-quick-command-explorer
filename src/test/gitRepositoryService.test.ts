import { beforeEach, describe, expect, it } from 'vitest';
import {
  __createGitExtension,
  __mockState,
  __resetMock,
} from './__mocks__/vscode';
import {
  GitRemote,
  GitRepository,
  getGitApi,
  getRepositoryWebUrl,
  openRepositoryInExternalBrowser,
  openRepositoryInIntegratedBrowser,
  pickRemoteUrl,
  toBrowsableUrl,
} from '../gitRepositoryService';
import { INTEGRATED_BROWSER_COMMAND_ID } from '../commandCatalog';

const GIT_EXTENSION_ID = 'vscode.git';
const SSH_REMOTE = 'git@github.com:NaokiIshimura/vscode-quick-command-explorer.git';
const WEB_URL = 'https://github.com/NaokiIshimura/vscode-quick-command-explorer';

/**
 * Creates a repository with the given remotes.
 */
function createRepository(remotes: GitRemote[]): GitRepository {
  return { state: { remotes } };
}

/**
 * Registers a Git extension mock reporting the given repositories.
 */
function setGitExtension(
  repositories: GitRepository[],
  options: { isActive?: boolean; getApiError?: unknown } = {}
): void {
  __mockState.extensions[GIT_EXTENSION_ID] = __createGitExtension(
    repositories,
    options
  );
}

beforeEach(() => {
  __resetMock();
});

describe('getGitApi', () => {
  it('returns undefined when the Git extension is missing', async () => {
    expect(await getGitApi()).toBeUndefined();
  });

  it('activates the extension when it is not active yet', async () => {
    setGitExtension([createRepository([])]);

    expect((await getGitApi())?.repositories).toHaveLength(1);
  });

  it('uses the exports directly when the extension is already active', async () => {
    setGitExtension([createRepository([])], { isActive: true });

    expect((await getGitApi())?.repositories).toHaveLength(1);
  });

  it('returns undefined when getAPI throws (git.enabled disabled)', async () => {
    setGitExtension([], { getApiError: new Error('Git model not found') });

    expect(await getGitApi()).toBeUndefined();
  });
});

describe('pickRemoteUrl', () => {
  it('prefers origin over the other remotes', () => {
    const repository = createRepository([
      { name: 'upstream', fetchUrl: 'https://github.com/other/repo.git' },
      { name: 'origin', fetchUrl: SSH_REMOTE },
    ]);

    expect(pickRemoteUrl(repository)).toBe(SSH_REMOTE);
  });

  it('falls back to the first remote when there is no origin', () => {
    const repository = createRepository([
      { name: 'upstream', fetchUrl: SSH_REMOTE },
      { name: 'fork', fetchUrl: 'https://github.com/other/repo.git' },
    ]);

    expect(pickRemoteUrl(repository)).toBe(SSH_REMOTE);
  });

  it('falls back to pushUrl when fetchUrl is missing', () => {
    const repository = createRepository([{ name: 'origin', pushUrl: SSH_REMOTE }]);

    expect(pickRemoteUrl(repository)).toBe(SSH_REMOTE);
  });

  it('ignores remotes that have no URL', () => {
    const repository = createRepository([
      { name: 'origin' },
      { name: 'upstream', fetchUrl: SSH_REMOTE },
    ]);

    expect(pickRemoteUrl(repository)).toBe(SSH_REMOTE);
  });

  it('returns undefined when the repository has no remote', () => {
    expect(pickRemoteUrl(createRepository([]))).toBeUndefined();
  });
});

describe('toBrowsableUrl', () => {
  it.each([
    ['SCP-like SSH', SSH_REMOTE],
    ['SCP-like SSH without .git', SSH_REMOTE.replace(/\.git$/, '')],
    [
      'ssh scheme',
      'ssh://git@github.com/NaokiIshimura/vscode-quick-command-explorer.git',
    ],
    [
      'ssh scheme with a port',
      'ssh://git@github.com:22/NaokiIshimura/vscode-quick-command-explorer.git',
    ],
    [
      'git scheme',
      'git://github.com/NaokiIshimura/vscode-quick-command-explorer.git',
    ],
    ['https', `${WEB_URL}.git`],
    ['https with credentials', `https://user@github.com/NaokiIshimura/vscode-quick-command-explorer.git`],
    ['http', `http://github.com/NaokiIshimura/vscode-quick-command-explorer.git`],
    ['a trailing slash', `${WEB_URL}/`],
    ['surrounding whitespace', `  ${SSH_REMOTE}\n`],
  ])('converts the %s form', (_name, remoteUrl) => {
    expect(toBrowsableUrl(remoteUrl)).toBe(WEB_URL);
  });

  it('keeps a self-hosted host as is', () => {
    expect(toBrowsableUrl('git@gitlab.example.com:group/repo.git')).toBe(
      'https://gitlab.example.com/group/repo'
    );
  });

  it.each([
    ['an empty string', ''],
    ['a local path', '/Users/naoki/GitHub/repo'],
    ['a host without a path', 'https://github.com'],
    ['an unknown scheme', 'ftp://github.com/owner/repo.git'],
    ['a remote whose path is only .git', 'git@github.com:.git'],
  ])('returns undefined for %s', (_name, remoteUrl) => {
    expect(toBrowsableUrl(remoteUrl)).toBeUndefined();
  });
});

describe('getRepositoryWebUrl', () => {
  it('returns the web URL of the first repository', async () => {
    setGitExtension([createRepository([{ name: 'origin', fetchUrl: SSH_REMOTE }])]);

    expect(await getRepositoryWebUrl()).toEqual({ url: WEB_URL });
  });

  it('reports that the Git extension is unavailable', async () => {
    expect(await getRepositoryWebUrl()).toEqual({
      error: 'the Git extension is not available',
    });
  });

  it('reports that no repository is open', async () => {
    setGitExtension([]);

    expect(await getRepositoryWebUrl()).toEqual({
      error: 'no Git repository is open',
    });
  });

  it('reports that the repository has no remote', async () => {
    setGitExtension([createRepository([])]);

    expect(await getRepositoryWebUrl()).toEqual({
      error: 'the repository has no remote',
    });
  });

  it('reports a remote it cannot convert', async () => {
    setGitExtension([
      createRepository([{ name: 'origin', fetchUrl: '/local/path' }]),
    ]);

    expect(await getRepositoryWebUrl()).toEqual({
      error: 'cannot build a web URL from the remote "/local/path"',
    });
  });
});

describe('openRepositoryInExternalBrowser', () => {
  it('opens the resolved URL in the external browser', async () => {
    setGitExtension([createRepository([{ name: 'origin', fetchUrl: SSH_REMOTE }])]);

    expect(await openRepositoryInExternalBrowser()).toBe(true);
    expect(__mockState.externalUris).toEqual([WEB_URL]);
    expect(__mockState.warningMessages).toEqual([]);
  });

  it('shows a warning and opens nothing when the URL cannot be resolved', async () => {
    expect(await openRepositoryInExternalBrowser()).toBe(false);
    expect(__mockState.externalUris).toEqual([]);
    expect(__mockState.warningMessages).toEqual([
      'Quick Command Explorer: the Git extension is not available',
    ]);
  });
});

describe('openRepositoryInIntegratedBrowser', () => {
  it('passes the resolved URL to the integrated browser command', async () => {
    setGitExtension([createRepository([{ name: 'origin', fetchUrl: SSH_REMOTE }])]);

    expect(await openRepositoryInIntegratedBrowser()).toBe(true);
    expect(__mockState.executedCommands).toEqual([
      { command: INTEGRATED_BROWSER_COMMAND_ID, args: [WEB_URL] },
    ]);
    expect(__mockState.externalUris).toEqual([]);
  });

  it('shows a warning and runs nothing when the URL cannot be resolved', async () => {
    expect(await openRepositoryInIntegratedBrowser()).toBe(false);
    expect(__mockState.executedCommands).toEqual([]);
    expect(__mockState.warningMessages).toEqual([
      'Quick Command Explorer: the Git extension is not available',
    ]);
  });
});
