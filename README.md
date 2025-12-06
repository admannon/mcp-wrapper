# mcp-wrapper

MCP server to wrap duplicate commands and tools with server name prefix, preventing naming collisions when using multiple MCP servers.

## Features

- **Tool Name Prefixing**: Automatically prefixes tool names with the server name (e.g., `serverName__toolName`)
- **Multiple Server Support**: Connect to multiple underlying MCP servers
- **Transparent Proxying**: Routes tool calls to the correct underlying server
- **Customizable Separator**: Configure the separator between server name and tool name

## Installation

```bash
npm install mcp-wrapper
```

## Usage

### Programmatic Usage

```typescript
import { McpWrapper } from "mcp-wrapper";

const wrapper = new McpWrapper({
  name: "my-wrapper",
  version: "1.0.0",
  servers: [
    {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "your-token" },
    },
    {
      name: "filesystem",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
    },
  ],
  separator: "__", // optional, default is "__"
});

// Connect to all underlying servers
await wrapper.connectToServers();

// Start the wrapper server
await wrapper.start();
```

### Configuration

The wrapper is configured using a `WrapperConfig` object:

```typescript
interface WrapperConfig {
  // Name of this wrapper server
  name: string;

  // Version of this wrapper server
  version: string;

  // List of MCP servers to wrap
  servers: WrappedServerConfig[];

  // Separator used between server name and tool name (default: "__")
  separator?: string;
}

interface WrappedServerConfig {
  // Unique prefix name for this server
  name: string;

  // Command to execute to start the MCP server
  command: string;

  // Arguments to pass to the command
  args?: string[];

  // Environment variables for the server process
  env?: Record<string, string>;

  // Working directory for the server process
  cwd?: string;
}
```

### Example: Using with Claude Desktop

Add the wrapper to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "wrapped-servers": {
      "command": "node",
      "args": ["/path/to/your/wrapper-script.js"]
    }
  }
}
```

Where `wrapper-script.js` contains:

```javascript
import { McpWrapper } from "mcp-wrapper";

const wrapper = new McpWrapper({
  name: "wrapped-servers",
  version: "1.0.0",
  servers: [
    {
      name: "github1",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_1 },
    },
    {
      name: "github2",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_2 },
    },
  ],
});

await wrapper.connectToServers();
await wrapper.start();
```

> **Note:**  
> The example above uses environment variables (`GITHUB_TOKEN_1`, `GITHUB_TOKEN_2`) to provide authentication tokens to each GitHub server instance.  
> - **System-wide:** You can set these environment variables in your shell before running the script:
>   ```bash
>   export GITHUB_TOKEN_1=your_token_1
>   export GITHUB_TOKEN_2=your_token_2
>   node wrapper-script.js
>   ```
> - **Claude Desktop:** If you are using Claude Desktop, you can set environment variables for your script in the configuration. Look for an "Environment Variables" or "env" section in the MCP server configuration:
>   ```json
>   {
>     "mcpServers": {
>       "wrapped-servers": {
>         "command": "node",
>         "args": ["/path/to/your/wrapper-script.js"],
>         "env": {
>           "GITHUB_TOKEN_1": "your_token_1",
>           "GITHUB_TOKEN_2": "your_token_2"
>         }
>       }
>     }
>   }
>   ```
> If environment variables are not set, the script may fail to authenticate with the servers.

### Example: Using with VS Code (GitHub Copilot)

For VS Code with GitHub Copilot, create a `.vscode/mcp.json` file in your workspace:

```json
{
  "servers": {
    "wrapped-servers": {
      "command": "node",
      "args": ["/path/to/your/wrapper-script.mjs"],
      "env": {
        "GITHUB_TOKEN_1": "your_token_1",
        "GITHUB_TOKEN_2": "your_token_2"
      }
    }
  }
}
```

Where `wrapper-script.mjs` contains:

```javascript
import { McpWrapper } from "mcp-wrapper";

const wrapper = new McpWrapper({
  name: "wrapped-servers",
  version: "1.0.0",
  servers: [
    {
      name: "github1",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_1 },
    },
    {
      name: "github2",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_2 },
    },
  ],
});

await wrapper.connectToServers();
await wrapper.start();
```

Alternatively, you can configure MCP servers globally in VS Code settings (`settings.json`):

```json
{
  "github.copilot.chat.mcp.servers": {
    "wrapped-servers": {
      "command": "node",
      "args": ["/path/to/your/wrapper-script.mjs"],
      "env": {
        "GITHUB_TOKEN_1": "your_token_1",
        "GITHUB_TOKEN_2": "your_token_2"
      }
    }
  }
}
```

Now tools from both GitHub servers will be available with prefixed names:
- `github1__create_issue`
- `github1__list_pull_requests`
- `github2__create_issue`
- `github2__list_pull_requests`

## API

### McpWrapper

The main class for creating a wrapper server.

#### Constructor

```typescript
new McpWrapper(config: WrapperConfig)
```

#### Methods

- `connectToServers(): Promise<void>` - Connects to all configured underlying MCP servers
- `start(): Promise<void>` - Starts the wrapper server using stdio transport
- `close(): Promise<void>` - Closes all connections and stops the server
- `getWrappedTools(): Array<WrappedToolInfo>` - Returns information about all wrapped tools

### Utility Functions

```typescript
// Create a prefixed tool name
prefixToolName(serverName: string, toolName: string, separator?: string): string

// Parse a prefixed tool name
parseToolName(prefixedName: string, separator?: string): { serverName: string; originalName: string } | null

// Validate server name (doesn't contain separator)
isValidServerName(serverName: string, separator?: string): boolean

// Validate tool name (doesn't contain separator)
isValidToolName(toolName: string, separator?: string): boolean
```

## License

Apache-2.0
