import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dockerAvailable = spawnSync("docker", ["version"], { stdio: "ignore" }).status === 0;
const describeIfDocker = dockerAvailable ? describe : describe.skip;

describeIfDocker("deployment packaging", () => {
  const imageTag = `scout-mcp-test:${randomUUID()}`;
  const containerName = `scout-mcp-${randomUUID()}`;
  const hostPort = 38080;

  beforeAll(() => {
    const build = spawnSync("docker", ["build", "-t", imageTag, "."], {
      cwd: "/Users/rakis/code/mcp-server",
      encoding: "utf8"
    });

    if (build.status !== 0) {
      throw new Error(build.stderr || build.stdout || "docker build failed");
    }

    const run = spawnSync(
      "docker",
      [
        "run",
        "-d",
        "--rm",
        "--name",
        containerName,
        "-p",
        `${hostPort}:3000`,
        "-e",
        "SCOUT_API_KEY=test-api-key",
        imageTag
      ],
      {
        cwd: "/Users/rakis/code/mcp-server",
        encoding: "utf8"
      }
    );

    if (run.status !== 0) {
      throw new Error(run.stderr || run.stdout || "docker run failed");
    }
  }, 240000);

  afterAll(() => {
    spawnSync("docker", ["rm", "-f", containerName], {
      cwd: "/Users/rakis/code/mcp-server",
      encoding: "utf8"
    });
  });

  it("container starts and health check passes", async () => {
    let response: Response | undefined;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${hostPort}/health`);
        if (response.ok) {
          break;
        }
      } catch {
        // Wait for container startup.
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    expect(response?.ok).toBe(true);
    await expect(response?.json()).resolves.toEqual({ ok: true });
  }, 30000);

  it("supports MCP initialize through the containerized server", async () => {
    const client = new Client({ name: "deploy-test", version: "0.1.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${hostPort}/mcp`))
    );

    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThanOrEqual(13);

    await client.close();
  }, 30000);
});
