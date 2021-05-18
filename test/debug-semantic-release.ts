import { resolve } from "path";
import semanticRelease from "semantic-release";
import type { XmlFileSpec } from "../lib/UserConfig";

(async () => {
  try {
    const pluginPath = resolve(process.cwd(), "dist/index.js");
    const result = await semanticRelease(
      {
        branches: ["master"],
        ci: false,
        plugins: ["@semantic-release/commit-analyzer", pluginPath],
        files: [
          {
            path: "./test/Fixture/Directory.Build.props",
            type: "xml",
            branches: ["master"],
            replacements: [
              {
                key: "VersionPrefix",
                value: "${nextRelease.version}",
              },
              {
                key: "RepositoryCommit",
                value: "${nextRelease.gitHead}",
              },
              {
                key: "RepositoryBranch",
                value: "${branch.name}",
              },
            ],
          },
        ] as XmlFileSpec[],
      },
      {
        cwd: process.cwd(),
        env: { ...process.env, MY_ENV_VAR: "value" },
        stderr: process.stderr,
        stdout: process.stdout,
      },
    );

    if (!result) {
      console.log("Semantic Release returned no result");

      return;
    }

    console.log("Semantic Release result", result);
  } catch (err) {
    console.error("Semantic release threw an error", err);
  }
})();
