/**
 * Configuration for a single wrapped MCP server
 */
export interface WrappedServerConfig {
  /**
   * Unique prefix name for this server (used to prefix tool names)
   */
  name: string;

  /**
   * Command to execute to start the MCP server
   */
  command: string;

  /**
   * Arguments to pass to the command
   */
  args?: string[];

  /**
   * Environment variables for the server process
   */
  env?: Record<string, string>;

  /**
   * Working directory for the server process
   */
  cwd?: string;
}

/**
 * Configuration for the MCP wrapper server
 */
export interface WrapperConfig {
  /**
   * Name of this wrapper server
   */
  name: string;

  /**
   * Version of this wrapper server (optional, defaults to "1.0.0")
   */
  version?: string;

  /**
   * List of MCP servers to wrap
   */
  servers: WrappedServerConfig[];

  /**
   * Separator used between server name and tool name (default: "__")
   */
  separator?: string;
}

/**
 * Information about a wrapped tool
 */
export interface WrappedToolInfo {
  /**
   * Original tool name without prefix
   */
  originalName: string;

  /**
   * Server name that owns this tool
   */
  serverName: string;

  /**
   * Prefixed tool name (serverName + separator + originalName)
   */
  prefixedName: string;
}
