import template from "lodash.template";
import { Context } from "semantic-release";
import { XmlReplacement } from "./UserConfig";

/**
 * Updates a Kubernetes deployment yaml file, by replacing the version of a docker image tag with a new version.
 *
 * @param {string} yamlContent The content of the yaml file.
 * @param {string} imageName The name of the docker image whose version should be replaced.
 * @param {string} newVersion The new version number.
 * @returns {string} The updated yaml file content.
 * @throws {Error} When the old version of the image could not be matched in the existing yaml content.
 */
export const updateK8sYaml = (yamlContent: string, imageName: string, newVersion: string): string => {
  const regexString = `image:\\s+${escapeRegExp(imageName)}:v?(.*)`;
  const match = yamlContent.match(regexString);

  if (match === null) {
    throw new Error("Unable to match image and old version in yaml file.");
  }

  return yamlContent.replace(match[0], match[0].replace(match[1], newVersion));
};

/**
 * Updates the version in the pubspec.yaml file for Flutter plugins.
 *
 * @param {string} pubspecContent The content of the pubspec.yaml file.
 * @param {string} oldVersion The old version.
 * @param {string} newVersion The new version.
 * @returns {string} The updqated file content.
 * @throws {Error} When the old version could not be found in the pubspec.yaml file content.
 */
export const updatePubspecVersion = (pubspecContent: string, oldVersion: string, newVersion: string): string => {
  const regex = `version:\\s+(${oldVersion})`;

  const match = pubspecContent.match(regex);

  if (match === null) {
    throw new Error("Could not match old version in pubspec.yaml.");
  }

  return pubspecContent.replace(match[0], match[0].replace(match[1], newVersion));
};

/**
 * Updates given replacements in XML file content.
 *
 * @param {string} content The file content.
 * @param {Array.<{key: string, value: string}>} replacements The replacement values.
 * @param {object} context The
 */
export const updateXml = (
  content: string,
  replacements: XmlReplacement[],
  context: Context & { branch: { name: string } },
): string => {
  let result = content;
  for (const replacement of replacements) {
    const regex = `(<${replacement.key}>(.*)</${replacement.key}>)`;

    const match = result.match(regex);

    if (match === null) {
      context.logger.error(`Unable to match ${replacement.key} in xml file.`);
      continue;
    }

    const value = template(replacement.value)(Object.assign({}, context, context.env));

    if (!value) {
      context.logger.log(`Skipping replacement of key ${replacement.key} in xml file because value would be empty.`);
      continue;
    }

    const newEntry = `<${replacement.key}>${value}</${replacement.key}>`;
    result = result.replace(match[1], newEntry);
  }

  return result;
};

/**
 * Escapes an input to be compatible with regex.
 *
 * @param {string} value
 * @returns {string} The escaped input.
 */
const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|/[\]\\]/g, "\\$&");
};
