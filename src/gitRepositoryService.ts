import * as vscode from 'vscode';
import { INTEGRATED_BROWSER_COMMAND_ID } from './commandCatalog';

/** Extension ID of the Git extension bundled with VSCode */
const GIT_EXTENSION_ID = 'vscode.git';

/** Version of the Git extension API this file is written against */
const GIT_API_VERSION = 1;

/** Remote name preferred when a repository has more than one remote */
const PREFERRED_REMOTE_NAME = 'origin';

/**
 * Remote of a Git repository.
 *
 * The Git extension does not ship its type definitions through
 * @types/vscode, so only the members used here are declared.
 */
export interface GitRemote {
  /** Remote name (origin, upstream, ...) */
  readonly name: string;
  /** URL used for fetching */
  readonly fetchUrl?: string;
  /** URL used for pushing */
  readonly pushUrl?: string;
}

/**
 * Git repository opened in the current window.
 */
export interface GitRepository {
  /** Repository state, holding the remotes */
  readonly state: { readonly remotes: readonly GitRemote[] };
}

/**
 * Git extension API.
 */
export interface GitApi {
  /** Repositories opened in the current window */
  readonly repositories: readonly GitRepository[];
}

/**
 * Value exported by the Git extension.
 */
interface GitExtensionExports {
  getAPI(version: number): GitApi;
}

/**
 * Returns the API of the Git extension bundled with VSCode.
 *
 * Returns undefined when the extension is missing or when the git.enabled
 * setting is disabled, because getAPI() throws in that case.
 *
 * @returns Git extension API, or undefined when it cannot be used
 */
export async function getGitApi(): Promise<GitApi | undefined> {
  const extension =
    vscode.extensions.getExtension<GitExtensionExports>(GIT_EXTENSION_ID);

  if (!extension) {
    return undefined;
  }

  try {
    const exports = extension.isActive
      ? extension.exports
      : await extension.activate();

    return exports.getAPI(GIT_API_VERSION);
  } catch {
    return undefined;
  }
}

/**
 * Picks the remote URL to use for a repository.
 * origin wins, otherwise the first remote that has a URL is used.
 *
 * @param repository Git repository
 * @returns Remote URL, or undefined when the repository has no remote
 */
export function pickRemoteUrl(repository: GitRepository): string | undefined {
  const remotes = repository.state.remotes.filter(
    (remote) => remote.fetchUrl ?? remote.pushUrl
  );
  const remote =
    remotes.find((candidate) => candidate.name === PREFERRED_REMOTE_NAME) ??
    remotes[0];

  return remote ? remote.fetchUrl ?? remote.pushUrl : undefined;
}

/**
 * Builds an https URL from a host and a repository path.
 * The host is always non-empty because the callers match it with [^/:]+.
 *
 * @param host Host name
 * @param path Repository path
 * @returns https URL, or undefined when the path is empty
 */
function buildHttpsUrl(host: string, path: string): string | undefined {
  const normalizedPath = path
    .replace(/\.git$/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (normalizedPath === '') {
    return undefined;
  }

  return `https://${host}/${normalizedPath}`;
}

/**
 * Converts a Git remote URL into a URL that can be opened in a browser.
 *
 * Both the SCP-like SSH form (git@github.com:owner/repo.git) and the
 * scheme form (https://, ssh://, git://) are supported. Credentials, the
 * port and the trailing .git are dropped, and the result always uses https
 * so it can be handed to a browser as is.
 *
 * @param remoteUrl Remote URL as stored by Git
 * @returns Browsable https URL, or undefined when the form is unknown
 */
export function toBrowsableUrl(remoteUrl: string): string | undefined {
  const trimmed = remoteUrl.trim();

  // SCP-like form: git@github.com:owner/repo.git
  const scpLike = /^[\w.-]+@([^/:]+):(.+)$/.exec(trimmed);

  if (scpLike) {
    return buildHttpsUrl(scpLike[1], scpLike[2]);
  }

  // Scheme form: https://github.com/owner/repo.git
  const withScheme = /^(?:https?|ssh|git):\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/.exec(
    trimmed
  );

  if (withScheme) {
    return buildHttpsUrl(withScheme[1], withScheme[2]);
  }

  return undefined;
}

/**
 * Resolves the web page URL of the repository opened in the current window.
 *
 * The first repository is used when several are open, because the command
 * has no tree node to derive a repository from.
 *
 * @returns Web page URL, or undefined together with the reason it failed
 */
export async function getRepositoryWebUrl(): Promise<
  { readonly url: string } | { readonly error: string }
> {
  const api = await getGitApi();

  if (!api) {
    return { error: 'the Git extension is not available' };
  }

  const repository = api.repositories[0];

  if (!repository) {
    return { error: 'no Git repository is open' };
  }

  const remoteUrl = pickRemoteUrl(repository);

  if (!remoteUrl) {
    return { error: 'the repository has no remote' };
  }

  const url = toBrowsableUrl(remoteUrl);

  if (!url) {
    return { error: `cannot build a web URL from the remote "${remoteUrl}"` };
  }

  return { url };
}

/**
 * Resolves the web page URL, showing a warning when it cannot be resolved.
 *
 * @returns Web page URL, or undefined when a warning was shown instead
 */
async function resolveWebUrlOrWarn(): Promise<string | undefined> {
  const resolved = await getRepositoryWebUrl();

  if ('error' in resolved) {
    vscode.window.showWarningMessage(
      `Quick Command Explorer: ${resolved.error}`
    );

    return undefined;
  }

  return resolved.url;
}

/**
 * Opens the web page of the repository in the external browser.
 * A warning is shown instead when the URL cannot be resolved.
 *
 * @returns True when the page was opened
 */
export async function openRepositoryInExternalBrowser(): Promise<boolean> {
  const url = await resolveWebUrlOrWarn();

  if (!url) {
    return false;
  }

  await vscode.env.openExternal(vscode.Uri.parse(url));

  return true;
}

/**
 * Opens the web page of the repository in the integrated browser.
 * A warning is shown instead when the URL cannot be resolved.
 *
 * @returns True when the page was opened
 */
export async function openRepositoryInIntegratedBrowser(): Promise<boolean> {
  const url = await resolveWebUrlOrWarn();

  if (!url) {
    return false;
  }

  await vscode.commands.executeCommand(INTEGRATED_BROWSER_COMMAND_ID, url);

  return true;
}
