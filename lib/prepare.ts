import { readFile, writeFile } from "fs/promises";
import { Config, Context } from "semantic-release";
import { FILE_TYPE_CONTAINERFILE, FILE_TYPE_FLUTTER, FILE_TYPE_K8S, FILE_TYPE_XML } from "./supportedFileTypes";
import { UserConfig } from "./UserConfig";
import { updateK8sYaml, updateXml, updatePubspecVersion, updateContainerfile } from "./versionReplacer";

/**
 * Executes the prepare step of the Semantic Release plugin.
 *
 * @param pluginConfig The Semantic Release configuration including the plugin configuration.
 * @param context The Semantic Release context.
 */
export const prepare = async (
  pluginConfig: Config & UserConfig,
  context: Context & { branch: { name: string } },
): Promise<void> => {
  if (!context.nextRelease || !context.lastRelease) {
    throw new Error("Unable to update file contents because Semantic Release context has no release information.");
  }

  for (const file of pluginConfig.files) {
    if (!Array.isArray(file.path)) {
      file.path = [file.path];
    }

    // Check branch filter for files
    if (file.branches) {
      if (!context.branch || !context.branch.name) {
        throw new Error("Unable to check branch because Semantic Release context has no branch information.");
      }

      if (!Array.isArray(file.branches)) {
        file.branches = [file.branches];
      }

      if (!file.branches.includes(context.branch.name)) {
        context.logger.log(
          "Skipping file %s because it should not run in the branch %s",
          file.path,
          context.branch.name,
        );
        continue;
      }
    }

    for (const filepath of file.path) {
      context.logger.log(
        "Replacing %s with version %s in %s",
        context.lastRelease?.version,
        context.nextRelease?.version,
        filepath,
      );

      let content = (await readFile(filepath)).toString();

      switch (file.type) {
        case FILE_TYPE_K8S:
          {
            if (!Array.isArray(file.image)) {
              file.image = [file.image];
            }

            const oldVersion = file.exactMatch ? context.lastRelease.version : undefined;

            for (const image of file.image) {
              content = updateK8sYaml(content, image, context.nextRelease.version, oldVersion);
            }
          }
          break;
        case FILE_TYPE_XML:
          content = updateXml(content, file.replacements, context);
          break;
        case FILE_TYPE_FLUTTER:
          content = updatePubspecVersion(content, context.lastRelease.version, context.nextRelease.version);
          break;
        case FILE_TYPE_CONTAINERFILE:
          content = updateContainerfile(content, file.label, context);
          break;
      }

      await writeFile(filepath, content);
    }
  }
};
