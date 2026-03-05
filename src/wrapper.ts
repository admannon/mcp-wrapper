import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport, SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { WrapperConfig, WrappedServerConfig } from "./types.js";
import { prefixToolName as utilPrefixToolName, isValidServerName, getSupplementalEnv } from "./utils.js";

const DEFAULT_SEPARATOR = "__";
const DEFAULT_VERSION = "1.0.0";
const SERVER_CLOSE_TIMEOUT_MS = 5000;
const SERVER_CONNECT_TIMEOUT_MS = 30000; // 30 seconds timeout for connecting to child servers

/**
 * Error class for server configuration validation errors
 * These errors should fail fast and not be caught by resilient connection handling
 */
class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

interface ConnectedServer {
  config: WrappedServerConfig;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;
  tools: Tool[];
}

/**
 * MCP Wrapper Server that prefixes tool names from multiple underlying MCP servers
 * to prevent naming collisions.
 */
export class McpWrapper {
  private config: WrapperConfig;
  private separator: string;
  private connectedServers: Map<string, ConnectedServer> = new Map();
  private failedServers: Map<string, { config: WrappedServerConfig; error: string }> = new Map();
  private server: Server;
  private toolToServerMap: Map<string, { serverName: string; originalName: string }> = new Map();

  constructor(config: WrapperConfig) {
    this.config = config;
    this.separator = config.separator ?? DEFAULT_SEPARATOR;

    // Validate server names don't contain separator and are unique
    const seenServerNames = new Set<string>();
    const reservedNames = ['wrapper'];
    
    for (const serverConfig of config.servers) {
      // Validate required fields
      if (!serverConfig.name || typeof serverConfig.name !== 'string') {
        throw new Error(
          `Invalid server configuration: each server must have a 'name' field (string)`
        );
      }
      
      // Check for reserved names
      const lowerName = serverConfig.name.toLowerCase();
      if (reservedNames.includes(lowerName)) {
        throw new Error(
          `Invalid server name "${serverConfig.name}": server name cannot be "wrapper" as it is reserved for wrapper management tools`
        );
      }
      
      if (!isValidServerName(serverConfig.name, this.separator)) {
        throw new Error(
          `Invalid server name "${serverConfig.name}": server names cannot contain the separator "${this.separator}"`
        );
      }
      if (seenServerNames.has(serverConfig.name)) {
        throw new Error(
          `Duplicate server name "${serverConfig.name}": each server must have a unique name`
        );
      }
      seenServerNames.add(serverConfig.name);
    }

    this.server = new Server(
      {
        name: config.name,
        version: config.version ?? DEFAULT_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Creates a prefixed tool name
   */
  private prefixToolName(serverName: string, toolName: string): string {
    return utilPrefixToolName(serverName, toolName, this.separator);
  }

  /**
   * Looks up tool mapping from the tool name to server map
   */
  private lookupToolMapping(prefixedName: string): { serverName: string; originalName: string } | null {
    const mapping = this.toolToServerMap.get(prefixedName);
    if (mapping) {
      return mapping;
    }
    return null;
  }

  /**
   * Connects to a single underlying MCP server
   */
  private async connectToServer(serverConfig: WrappedServerConfig): Promise<ConnectedServer> {
    // Validate that either command or url is provided, but not both
    const hasCommand = !!serverConfig.command;
    const hasUrl = !!serverConfig.url;

    if (!hasCommand && !hasUrl) {
      throw new ConfigurationError(
        `Server "${serverConfig.name}" must specify either "command" or "url"`
      );
    }

    if (hasCommand && hasUrl) {
      throw new ConfigurationError(
        `Server "${serverConfig.name}" cannot specify both "command" and "url"`
      );
    }

    let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;
    let parsedUrl: URL | undefined;

    if (serverConfig.url) {
      // Validate URL format
      try {
        parsedUrl = new URL(serverConfig.url);
      } catch (error) {
        throw new ConfigurationError(
          `Server "${serverConfig.name}" has invalid URL format: "${serverConfig.url}"`
        );
      }

      // Try Streamable HTTP first (modern protocol), fall back to SSE (legacy)
      // Streamable HTTP is the recommended protocol and what VS Code/Claude use
      transport = new StreamableHTTPClientTransport(parsedUrl);
    } else {
      // Use stdio transport for command-based servers
      // serverConfig.command is guaranteed to exist due to validation above
      transport = new StdioClientTransport({
        command: serverConfig.command as string,
        args: serverConfig.args,
        env: { ...getSupplementalEnv(), ...serverConfig.env },
        cwd: serverConfig.cwd,
      });
    }

    const client = new Client(
      {
        name: `${this.config.name}-client`,
        version: this.config.version ?? DEFAULT_VERSION,
      },
      {
        capabilities: {},
      }
    );

    try {
      await client.connect(transport);
    } catch (error) {
      // If Streamable HTTP fails, try SSE as fallback for legacy servers
      if (serverConfig.url && parsedUrl && transport instanceof StreamableHTTPClientTransport) {
        console.warn(`Streamable HTTP connection failed, trying SSE fallback for "${serverConfig.name}"...`);
        
        try {
          // Create a new client for SSE fallback to ensure clean state
          const sseClient = new Client(
            {
              name: `${this.config.name}-client`,
              version: this.config.version ?? DEFAULT_VERSION,
            },
            {
              capabilities: {},
            }
          );
          transport = new SSEClientTransport(parsedUrl);
          await sseClient.connect(transport);
          // Success with SSE fallback - replace the original client
          Object.assign(client, sseClient);
          console.warn(`Connected to "${serverConfig.name}" using legacy SSE transport`);
        } catch (sseError) {
          // Both transports failed, provide helpful error message
          if (sseError instanceof SseError) {
            const statusCode = sseError.code ?? "unknown";
            
            if (statusCode === 405) {
              throw new Error(
                `Server "${serverConfig.name}" at URL "${serverConfig.url}" returned HTTP 405 (Method Not Allowed). ` +
                `This URL does not support MCP Streamable HTTP or SSE transports. ` +
                `Make sure the URL points to an actual MCP server endpoint.`
              );
            } else if (statusCode === 404) {
              throw new Error(
                `Server "${serverConfig.name}" at URL "${serverConfig.url}" returned HTTP 404 (Not Found). ` +
                `Please check that the URL is correct and the MCP server is running.`
              );
            } else {
              throw new Error(
                `Server "${serverConfig.name}" at URL "${serverConfig.url}" failed to connect with HTTP ${statusCode}. ` +
                `Tried both Streamable HTTP and SSE transports. ` +
                `Make sure the URL points to a valid MCP server endpoint.`
              );
            }
          }
          
          // Re-throw if not an SseError
          throw new Error(
            `Server "${serverConfig.name}" at URL "${serverConfig.url}" failed to connect. ` +
            `Streamable HTTP error: ${error instanceof Error ? error.message : String(error)}. ` +
            `SSE fallback error: ${sseError instanceof Error ? sseError.message : String(sseError)}`
          );
        }
      } else {
        // For stdio errors or other failures, re-throw original error
        throw error;
      }
    }

    // List tools from the server
    const toolsResult = await client.listTools();
    const tools = toolsResult.tools as Tool[];

    return {
      config: serverConfig,
      client,
      transport,
      tools,
    };
  }

  /**
   * Registers tool mappings for a connected server
   */
  private registerToolMappings(serverName: string, connectedServer: ConnectedServer): void {
    for (const tool of connectedServer.tools) {
      const prefixedName = this.prefixToolName(serverName, tool.name);
      
      // Warn about tool name collisions
      if (this.toolToServerMap.has(prefixedName)) {
        const previous = this.toolToServerMap.get(prefixedName);
        console.warn(
          `Tool name collision detected: "${prefixedName}" is being overwritten. ` +
          `Previous: server "${previous?.serverName}", tool "${previous?.originalName}". ` +
          `New: server "${serverName}", tool "${tool.name}".`
        );
      }
      
      this.toolToServerMap.set(prefixedName, {
        serverName: serverName,
        originalName: tool.name,
      });
    }
  }

  /**
   * Helper method to connect and register a server
   */
  private async connectAndRegisterServer(
    serverName: string,
    serverConfig: WrappedServerConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      const connectedServer = await this.connectToServer(serverConfig);
      this.connectedServers.set(serverName, connectedServer);
      this.failedServers.delete(serverName);
      this.registerToolMappings(serverName, connectedServer);
      
      console.error(`Connected to server "${serverName}" with ${connectedServer.tools.length} tools`);
      return {
        success: true,
        message: `Successfully connected to server "${serverName}" with ${connectedServer.tools.length} tool(s)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failedServers.set(serverName, {
        config: serverConfig,
        error: errorMessage,
      });
      return {
        success: false,
        message: `Failed to connect to server "${serverName}": ${errorMessage}`,
      };
    }
  }

  /**
   * Reconnects to a specific server by name
   */
  async reconnectServer(serverName: string): Promise<{ success: boolean; message: string }> {
    // Check if it's already connected
    if (this.connectedServers.has(serverName)) {
      return {
        success: false,
        message: `Server "${serverName}" is already connected`,
      };
    }
    
    // Check if server is in failed list
    const failedServer = this.failedServers.get(serverName);
    if (failedServer) {
      return this.connectAndRegisterServer(serverName, failedServer.config);
    }
    
    // Check if it exists in config
    const serverConfig = this.config.servers.find(s => s.name === serverName);
    if (!serverConfig) {
      return {
        success: false,
        message: `Server "${serverName}" not found in configuration`,
      };
    }
    
    return this.connectAndRegisterServer(serverName, serverConfig);
  }

  /**
   * Connects to all configured underlying MCP servers
   * Skips servers that fail to connect and tracks them for retry
   */
  async connectToServers(): Promise<void> {
    for (const serverConfig of this.config.servers) {
      try {
        // Add timeout to prevent hanging on slow or unresponsive servers
        // Assign timeoutId before starting the race to avoid race condition
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error(`Connection timeout after ${SERVER_CONNECT_TIMEOUT_MS}ms`)),
            SERVER_CONNECT_TIMEOUT_MS
          );
        });
        
        const connectedServer = await Promise.race([
          this.connectToServer(serverConfig).finally(() => {
            clearTimeout(timeoutId);
          }),
          timeoutPromise,
        ]);
        this.connectedServers.set(serverConfig.name, connectedServer);
        
        // Remove from failed servers if it was previously failing
        this.failedServers.delete(serverConfig.name);

        // Register tool mappings
        this.registerToolMappings(serverConfig.name, connectedServer);

        console.error(`Connected to server "${serverConfig.name}" with ${connectedServer.tools.length} tools`);
      } catch (error) {
        // Handle all errors gracefully - log and continue with other servers
        // This includes both configuration errors and connection errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to connect to server "${serverConfig.name}": ${errorMessage}`);
        
        // Track failed server for potential retry
        this.failedServers.set(serverConfig.name, {
          config: serverConfig,
          error: errorMessage,
        });
        
        // Continue to next server instead of throwing
        console.error(`Skipping server "${serverConfig.name}", will continue with remaining servers`);
      }
    }
    
    // Log summary
    console.error(`Successfully connected to ${this.connectedServers.size} server(s)`);
    if (this.failedServers.size > 0) {
      console.error(`Failed to connect to ${this.failedServers.size} server(s): ${Array.from(this.failedServers.keys()).join(', ')}`);
    }
  }

  /**
   * Cleans up all connected servers (used during error recovery)
   */
  private async cleanupConnectedServers(): Promise<void> {
    for (const [serverName, connectedServer] of this.connectedServers) {
      try {
        await connectedServer.transport.close();
        console.error(`Cleaned up connection to server "${serverName}"`);
      } catch (closeError) {
        console.error(`Error cleaning up connection to "${serverName}":`, closeError);
      }
    }
    this.connectedServers.clear();
    this.toolToServerMap.clear();
  }

  /**
   * Sets up request handlers for the wrapper server
   */
  private setupHandlers(): void {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools: Tool[] = [];

      for (const [serverName, connectedServer] of this.connectedServers) {
        for (const tool of connectedServer.tools) {
          const prefixedName = this.prefixToolName(serverName, tool.name);
          allTools.push({
            ...tool,
            name: prefixedName,
            description: `[${serverName}] ${tool.description ?? ""}`,
          });
        }
      }

      // Add wrapper management tools
      allTools.push({
        name: "wrapper__reconnect_server",
        description: "Reconnect to a failed MCP server",
        inputSchema: {
          type: "object",
          properties: {
            serverName: {
              type: "string",
              description: "Name of the server to reconnect",
            },
          },
          required: ["serverName"],
        },
      });

      allTools.push({
        name: "wrapper__list_servers",
        description: "List all configured servers with their connection status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      });

      return { tools: allTools };
    });

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: prefixedName, arguments: args } = request.params;

      // Handle wrapper management tools
      if (prefixedName === "wrapper__reconnect_server") {
        const serverName = (args as any)?.serverName;
        if (!serverName || typeof serverName !== 'string') {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: serverName parameter is required and must be a string",
              },
            ],
            isError: true,
          };
        }

        const result = await this.reconnectServer(serverName);
        return {
          content: [
            {
              type: "text" as const,
              text: result.message,
            },
          ],
          isError: !result.success,
        };
      }

      if (prefixedName === "wrapper__list_servers") {
        const serverList = {
          connected: Array.from(this.connectedServers.entries()).map(([name, server]) => ({
            name,
            toolCount: server.tools.length,
            status: "connected",
          })),
          failed: Array.from(this.failedServers.entries()).map(([name, failed]) => ({
            name,
            status: "failed",
            error: failed.error,
          })),
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(serverList, null, 2),
            },
          ],
        };
      }

      const mapping = this.lookupToolMapping(prefixedName);
      if (!mapping) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Unknown tool "${prefixedName}"`,
            },
          ],
          isError: true,
        };
      }

      const { serverName, originalName } = mapping;
      const connectedServer = this.connectedServers.get(serverName);

      if (!connectedServer) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Server "${serverName}" is not connected`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await connectedServer.client.callTool({
          name: originalName,
          arguments: args,
        });

        return result;
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error calling tool "${originalName}" on server "${serverName}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Starts the wrapper server using stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP Wrapper "${this.config.name}" started`);
  }

  /**
   * Closes all connections and stops the server
   */
  async close(): Promise<void> {
    for (const [serverName, connectedServer] of this.connectedServers) {
      try {
        await connectedServer.transport.close();
        console.error(`Disconnected from server "${serverName}"`);
      } catch (error) {
        console.error(`Error closing connection to "${serverName}":`, error);
      }
    }
    this.connectedServers.clear();
    this.toolToServerMap.clear();
    
    // Add a timeout to server.close() to prevent hanging
    try {
      await Promise.race([
        this.server.close(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout closing wrapper server")), SERVER_CLOSE_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.error("Error closing wrapper server:", error);
    }
  }

  /**
   * Returns information about all wrapped tools
   */
  getWrappedTools(): Array<{
    serverName: string;
    originalName: string;
    prefixedName: string;
    description?: string;
  }> {
    const result: Array<{
      serverName: string;
      originalName: string;
      prefixedName: string;
      description?: string;
    }> = [];

    for (const [serverName, connectedServer] of this.connectedServers) {
      for (const tool of connectedServer.tools) {
        result.push({
          serverName,
          originalName: tool.name,
          prefixedName: this.prefixToolName(serverName, tool.name),
          description: tool.description,
        });
      }
    }

    return result;
  }
}
