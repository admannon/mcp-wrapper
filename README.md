# mcp-wrapper

MCP server to wrap duplicate commands and tools with server name prefix, preventing naming collisions when using multiple MCP servers.

## Features

- **Tool Name Prefixing**: Automatically prefixes tool names with the server name (e.g., `serverName__toolName`)
- **Multiple Server Support**: Connect to multiple underlying MCP servers
- **Transparent Proxying**: Routes tool calls to the correct underlying server
- **Customizable Separator**: Configure the separator between server name and tool name
- **CLI Support**: Run directly via `npx` without creating a wrapper script

## Installation

```bash
npm install mcp-wrapper
```

## Usage

### CLI Usage (No Script File Required)

You can run the wrapper directly via `npx` without creating any script files:

```bash
# Using a config file
npx mcp-wrapper --config ./mcp-wrapper.json

# Using inline JSON config
npx mcp-wrapper --config '{"name":"my-wrapper","version":"1.0.0","servers":[{"name":"github","command":"npx","args":["-y","@modelcontextprotocol/server-github"]}]}'

# Using environment variable
export MCP_WRAPPER_CONFIG='{"name":"my-wrapper","version":"1.0.0","servers":[...]}'
npx mcp-wrapper
```

Example config file (`mcp-wrapper.json`):

```json
{
  "name": "my-wrapper",
  "version": "1.0.0",
  "separator": "__",
  "servers": [
    {
      "name": "github1",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "token1" }
    },
    {
      "name": "github2",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "token2" }
    },
    {
      "name": "remote",
      "url": "http://localhost:3000/sse"
    }
  ]
}
```

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
    {
      name: "remote",
      url: "http://localhost:3000/sse",
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

  // Command to execute to start the MCP server (for stdio transport)
  // Either command or url must be specified, but not both
  command?: string;

  // Arguments to pass to the command (only used with command)
  args?: string[];

  // Environment variables for the server process (only used with command)
  env?: Record<string, string>;

  // Working directory for the server process (only used with command)
  cwd?: string;

  // URL to connect to the MCP server (for SSE transport)
  // Either command or url must be specified, but not both
  url?: string;
}
```

#### Server Types

The wrapper supports two types of MCP server connections:

**1. Stdio-based servers (using `command`)**

These servers are started as child processes and communicate via stdin/stdout. This is the traditional MCP server approach.

```json
{
  "name": "local-server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_TOKEN": "your_token" }
}
```

**2. HTTP/SSE-based servers (using `url`)**

These servers are accessed via HTTP using Server-Sent Events (SSE) for receiving messages. Useful for connecting to remote MCP servers or servers running in containers.

```json
{
  "name": "remote-server",
  "url": "http://localhost:3000/sse"
}
```

**Note:** Each server must specify either `command` or `url`, but not both. You can mix both types of servers in the same wrapper configuration.

### Example: Using with Claude Desktop

**Option 1: Using CLI with config file (Recommended - No script file needed)**

Create a config file `~/.config/mcp-wrapper.json`:
```json
{
  "name": "wrapped-servers",
  "version": "1.0.0",
  "servers": [
    {
      "name": "github1",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your_token_1" }
    },
    {
      "name": "github2",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your_token_2" }
    }
  ]
}
```

Then add to Claude Desktop configuration:
```json
{
  "mcpServers": {
    "wrapped-servers": {
      "command": "npx",
      "args": ["-y", "mcp-wrapper", "--config", "~/.config/mcp-wrapper.json"]
    }
  }
}
```

**Option 2: Using inline JSON config (No files needed at all)**

```json
{
  "mcpServers": {
    "wrapped-servers": {
      "command": "npx",
      "args": ["-y", "mcp-wrapper", "--config", "{\"name\":\"wrapped\",\"version\":\"1.0.0\",\"servers\":[{\"name\":\"github1\",\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-github\"],\"env\":{\"GITHUB_TOKEN\":\"token1\"}},{\"name\":\"github2\",\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-github\"],\"env\":{\"GITHUB_TOKEN\":\"token2\"}}]}"]
    }
  }
}
```

**Option 3: Using a wrapper script**

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
> The script example above uses environment variables (`GITHUB_TOKEN_1`, `GITHUB_TOKEN_2`) to provide authentication tokens.  
> You can set these in the `env` section of Claude Desktop's MCP server configuration:
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

### Example: Using with VS Code (GitHub Copilot)

**Option 1: Using CLI with config file (Recommended - No script file needed)**

Create a config file `mcp-wrapper.json` in your project or home directory, then create `.vscode/mcp.json`:

```json
{
  "servers": {
    "wrapped-servers": {
      "command": "npx",
      "args": ["-y", "mcp-wrapper", "--config", "/path/to/mcp-wrapper.json"]
    }
  }
}
```

**Option 2: Using a wrapper script**

Create a `.vscode/mcp.json` file in your workspace:

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
      "command": "npx",
      "args": ["-y", "mcp-wrapper", "--config", "/path/to/mcp-wrapper.json"]
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
