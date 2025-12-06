#!/usr/bin/env node

/**
 * CLI entry point for mcp-wrapper
 * 
 * Usage:
 *   npx mcp-wrapper --config /path/to/config.json
 *   npx mcp-wrapper --config '{"name":"wrapper","version":"1.0.0","servers":[...]}'
 *   MCP_WRAPPER_CONFIG='{"name":"wrapper",...}' npx mcp-wrapper
 */

import { readFileSync, existsSync } from "node:fs";
import { McpWrapper } from "./wrapper.js";
import type { WrapperConfig } from "./types.js";

function printUsage(): void {
  console.error(`
mcp-wrapper - MCP server wrapper with tool name prefixing

Usage:
  npx mcp-wrapper --config <path-to-config.json>
  npx mcp-wrapper --config '<json-config-string>'
  MCP_WRAPPER_CONFIG='<json-config>' npx mcp-wrapper

Configuration JSON format:
{
  "name": "my-wrapper",
  "version": "1.0.0",  // optional, default "1.0.0"
  "separator": "__",   // optional, default "__"
  "servers": [
    {
      "name": "server1",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "token" }
    }
  ]
}

Examples:
  # Using config file
  npx mcp-wrapper --config ./mcp-wrapper.json

  # Using inline JSON (minimal - version is optional)
  npx mcp-wrapper --config '{"name":"w","servers":[{"name":"gh","command":"npx","args":["-y","@modelcontextprotocol/server-github"]}]}'

  # Using environment variable
  export MCP_WRAPPER_CONFIG='{"name":"w","servers":[...]}'
  npx mcp-wrapper
`);
}

function parseConfig(configArg: string): WrapperConfig {
  // Check if it's a file path
  if (existsSync(configArg)) {
    const content = readFileSync(configArg, "utf-8");
    return JSON.parse(content) as WrapperConfig;
  }

  // Try to parse as JSON directly
  try {
    return JSON.parse(configArg) as WrapperConfig;
  } catch {
    throw new Error(`Config is not a valid file path or JSON: ${configArg}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let configArg: string | undefined;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" || args[i] === "-c") {
      configArg = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  // Fall back to environment variable
  if (!configArg) {
    configArg = process.env.MCP_WRAPPER_CONFIG;
  }

  if (!configArg) {
    console.error("Error: No configuration provided.");
    printUsage();
    process.exit(1);
  }

  let config: WrapperConfig;
  try {
    config = parseConfig(configArg);
  } catch (error) {
    console.error(`Error parsing configuration: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Validate required fields
  if (!config.name || !config.servers) {
    console.error("Error: Configuration must include 'name' and 'servers' fields.");
    process.exit(1);
  }

  const wrapper = new McpWrapper(config);

  try {
    console.error("Connecting to servers...");
    await wrapper.connectToServers();

    const tools = wrapper.getWrappedTools();
    const serverNames = new Set(tools.map((t) => t.serverName));
    console.error(`Loaded ${tools.length} tools from ${serverNames.size} server(s)`);

    console.error("Starting wrapper server...");
    await wrapper.start();

    // Handle shutdown
    const shutdown = async () => {
      console.error("Shutting down...");
      await wrapper.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
