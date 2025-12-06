import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { WrapperConfig, WrappedServerConfig } from "./types.js";
import { prefixToolName as utilPrefixToolName } from "./utils.js";

const DEFAULT_SEPARATOR = "__";

interface ConnectedServer {
  config: WrappedServerConfig;
  client: Client;
  transport: StdioClientTransport;
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
  private server: Server;
  private toolToServerMap: Map<string, { serverName: string; originalName: string }> = new Map();

  constructor(config: WrapperConfig) {
    this.config = config;
    this.separator = config.separator ?? DEFAULT_SEPARATOR;

    this.server = new Server(
      {
        name: config.name,
        version: config.version,
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
   * Parses a prefixed tool name and returns the server name and original tool name
   */
  private parseToolName(prefixedName: string): { serverName: string; originalName: string } | null {
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
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      cwd: serverConfig.cwd,
    });

    const client = new Client(
      {
        name: `${this.config.name}-client`,
        version: this.config.version,
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

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
   * Connects to all configured underlying MCP servers
   */
  async connectToServers(): Promise<void> {
    for (const serverConfig of this.config.servers) {
      try {
        const connectedServer = await this.connectToServer(serverConfig);
        this.connectedServers.set(serverConfig.name, connectedServer);

        // Register tool mappings
        for (const tool of connectedServer.tools) {
          const prefixedName = this.prefixToolName(serverConfig.name, tool.name);
          this.toolToServerMap.set(prefixedName, {
            serverName: serverConfig.name,
            originalName: tool.name,
          });
        }

        console.error(`Connected to server "${serverConfig.name}" with ${connectedServer.tools.length} tools`);
      } catch (error) {
        console.error(`Failed to connect to server "${serverConfig.name}":`, error);
        throw error;
      }
    }
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

      return { tools: allTools };
    });

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: prefixedName, arguments: args } = request.params;

      const mapping = this.parseToolName(prefixedName);
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
    await this.server.close();
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
