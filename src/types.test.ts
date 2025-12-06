import { describe, it, expect } from "vitest";
import type { WrapperConfig, WrappedServerConfig } from "./types.js";

describe("types", () => {
  describe("WrappedServerConfig", () => {
    it("should allow minimal configuration", () => {
      const config: WrappedServerConfig = {
        name: "test-server",
        command: "node",
      };
      expect(config.name).toBe("test-server");
      expect(config.command).toBe("node");
      expect(config.args).toBeUndefined();
      expect(config.env).toBeUndefined();
      expect(config.cwd).toBeUndefined();
    });

    it("should allow full configuration", () => {
      const config: WrappedServerConfig = {
        name: "test-server",
        command: "node",
        args: ["server.js"],
        env: { NODE_ENV: "production" },
        cwd: "/app",
      };
      expect(config.name).toBe("test-server");
      expect(config.command).toBe("node");
      expect(config.args).toEqual(["server.js"]);
      expect(config.env).toEqual({ NODE_ENV: "production" });
      expect(config.cwd).toBe("/app");
    });
  });

  describe("WrapperConfig", () => {
    it("should allow minimal wrapper configuration", () => {
      const config: WrapperConfig = {
        name: "my-wrapper",
        version: "1.0.0",
        servers: [],
      };
      expect(config.name).toBe("my-wrapper");
      expect(config.version).toBe("1.0.0");
      expect(config.servers).toEqual([]);
      expect(config.separator).toBeUndefined();
    });

    it("should allow custom separator", () => {
      const config: WrapperConfig = {
        name: "my-wrapper",
        version: "1.0.0",
        servers: [],
        separator: "-",
      };
      expect(config.separator).toBe("-");
    });

    it("should allow multiple servers", () => {
      const config: WrapperConfig = {
        name: "my-wrapper",
        version: "1.0.0",
        servers: [
          { name: "server1", command: "node", args: ["server1.js"] },
          { name: "server2", command: "python", args: ["server2.py"] },
        ],
      };
      expect(config.servers).toHaveLength(2);
      expect(config.servers[0].name).toBe("server1");
      expect(config.servers[1].name).toBe("server2");
    });
  });
});
