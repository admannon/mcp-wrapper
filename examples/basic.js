#!/usr/bin/env node

/**
 * Example MCP Wrapper Server
 *
 * This example demonstrates how to use the MCP wrapper to combine multiple
 * MCP servers with prefixed tool names to prevent naming collisions.
 */

import { McpWrapper } from "../dist/index.js";

// Create wrapper with configuration
const wrapper = new McpWrapper({
  name: "example-wrapper",
  // version is optional, defaults to "1.0.0"
  servers: [
    // Example: Wrap two different MCP servers
    // Uncomment and modify based on your needs:
    //
    // {
    //   name: "github-work",
    //   command: "npx",
    //   args: ["-y", "@modelcontextprotocol/server-github"],
    //   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_WORK },
    // },
    // {
    //   name: "github-personal",
    //   command: "npx",
    //   args: ["-y", "@modelcontextprotocol/server-github"],
    //   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN_PERSONAL },
    // },
  ],
  separator: "__", // Optional: customize the separator (default is "__")
});

async function main() {
  try {
    // Connect to all underlying servers
    console.error("Connecting to servers...");
    await wrapper.connectToServers();

    // Log wrapped tools info
    const tools = wrapper.getWrappedTools();
    const serverNames = new Set(tools.map(t => t.serverName));
    console.error(`Loaded ${tools.length} tools from ${serverNames.size} servers`);
    for (const tool of tools) {
      console.error(`  - ${tool.prefixedName} (from ${tool.serverName})`);
    }

    // Start the wrapper server (uses stdio transport)
    console.error("Starting wrapper server...");
    await wrapper.start();

    // Handle shutdown
    process.on("SIGINT", async () => {
      console.error("Shutting down...");
      await wrapper.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.error("Shutting down...");
      await wrapper.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Error starting wrapper:", error);
    process.exit(1);
  }
}

main();
