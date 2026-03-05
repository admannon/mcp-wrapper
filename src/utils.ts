/**
 * Utility functions for tool name prefixing
 */

const DEFAULT_SEPARATOR = "__";

/**
 * Creates a prefixed tool name by combining server name and tool name
 */
export function prefixToolName(
  serverName: string,
  toolName: string,
  separator: string = DEFAULT_SEPARATOR
): string {
  return `${serverName}${separator}${toolName}`;
}

/**
 * Parses a prefixed tool name and returns the server name and original tool name
 * Returns null if the name doesn't contain the separator
 */
export function parseToolName(
  prefixedName: string,
  separator: string = DEFAULT_SEPARATOR
): { serverName: string; originalName: string } | null {
  const separatorIndex = prefixedName.indexOf(separator);
  if (separatorIndex === -1) {
    return null;
  }

  const serverName = prefixedName.substring(0, separatorIndex);
  const originalName = prefixedName.substring(separatorIndex + separator.length);

  if (!serverName || !originalName) {
    return null;
  }

  return { serverName, originalName };
}

/**
 * Validates that a server name doesn't contain the separator
 */
export function isValidServerName(
  serverName: string,
  separator: string = DEFAULT_SEPARATOR
): boolean {
  return !serverName.includes(separator);
}

/**
 * Validates that a tool name doesn't contain the separator
 */
export function isValidToolName(
  toolName: string,
  separator: string = DEFAULT_SEPARATOR
): boolean {
  return !toolName.includes(separator);
}

/**
 * Environment variables that are missing from the SDK's DEFAULT_INHERITED_ENV_VARS
 * whitelist on Windows but are required by common tools (e.g. OpenSSH needs ProgramData).
 */
const ADDITIONAL_WINDOWS_ENV_VARS = [
  'ProgramData',
  'ALLUSERSPROFILE',
];

/**
 * Returns supplemental environment variables that should be passed to child processes
 * to work around the SDK's restrictive env whitelist on Windows.
 * On non-Windows platforms, returns an empty object.
 */
export function getSupplementalEnv(): Record<string, string> {
  if (process.platform !== 'win32') {
    return {};
  }
  const env: Record<string, string> = {};
  for (const key of ADDITIONAL_WINDOWS_ENV_VARS) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
}
