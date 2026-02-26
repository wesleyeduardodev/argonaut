import type { GitProvider, GitServerConfig } from "./types";
import { GitHubClient } from "./github-client";

export function createGitProvider(config: GitServerConfig): GitProvider {
  switch (config.platform) {
    case "github":
      return new GitHubClient(config);
    default:
      throw new Error(`Unknown git platform: ${config.platform}`);
  }
}
