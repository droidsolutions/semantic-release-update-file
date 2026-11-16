/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/dot-notation */
import { template } from "lodash-es";
import type { PrepareContext } from "semantic-release";
import type { XmlReplacement } from "./UserConfig.mjs";

/**
 * Updates a Kubernetes deployment yaml file, by replacing the version of a docker image tag with a new version.
 *
 * @param {string} yamlContent The content of the yaml file.
 * @param {string} imageName The name of the docker image whose version should be replaced.
 * @param {string} oldVersion The old version number.
 * @param {string} newVersion The new version number.
 * @returns {string} The updated yaml file content.
 * @throws {Error} When the old version of the image could not be matched in the existing yaml content.
 */
export const updateK8sYaml = (
  yamlContent: string,
  imageName: string,
  newVersion: string,
  oldVersion?: string,
): string => {
  // Without an old version the whole tag is replaced, but it must stop before a closing quote of a quoted scalar.
  const lastVersion = oldVersion !== undefined ? escapeRegExp(oldVersion) : `[^\\s"']*`;
  const regex = new RegExp(`(image:\\s+["']?${escapeRegExp(imageName)}:v?)(?:${lastVersion})`, "gm");

  if (!regex.test(yamlContent)) {
    throw new Error("Unable to match image and old version in yaml file.");
  }

  return yamlContent.replace(regex, (_match, prefix: string) => `${prefix}${newVersion}`);
};

/**
 * Replaces the value of a property in the given file content. This only works for root level properties.
 * @param yamlContent The content of the file.
 * @param propertyName The name of the property.
 * @param newValue The new version to set.
 * @returns The new content of the file.
 */
export const updateVersionPropertyInYaml = (yamlContent: string, propertyName: string, newValue: string): string => {
  const regex = new RegExp(
    `^(?<prefix>${escapeRegExp(propertyName)}:\\sv?)(?<version>(?<mainversion>(\\d+)\\.(\\d+)\\.(\\d+)-?([a-zA-Z-\\d\\.]*))\\+?(?<build>[a-zA-Z-\\d\\.]*))$`,
    "m",
  );
  const match = regex.exec(yamlContent);

  if (match?.groups === undefined) {
    throw new Error(`Unable to match property ${propertyName} in yaml file.`);
  }

  let versionString = newValue;
  if (match.groups["build"] && parseInt(match.groups["build"]) > 0) {
    versionString = `${newValue}+${parseInt(match.groups["build"]) + 1}`;
  }

  // Replace at the position of the match, the same version string may appear earlier in the file.
  const start = match.index;
  const end = start + match[0].length;

  return `${yamlContent.slice(0, start)}${match.groups["prefix"]}${versionString}${yamlContent.slice(end)}`;
};

/**
 * Updates the version in the pubspec.yaml file for Flutter plugins.
 *
 * @param {string} pubspecContent The content of the pubspec.yaml file.
 * @param {string | undefined} _oldVersion The old version, undefined if it is the first release.
 * @param {string} newVersion The new version.
 * @returns {string} The updqated file content.
 * @throws {Error} When the old version could not be found in the pubspec.yaml file content.
 */
export const updatePubspecVersion = (
  pubspecContent: string,
  _oldVersion: string | undefined,
  newVersion: string,
): string => {
  return updateVersionPropertyInYaml(pubspecContent, "version", newVersion);
};

/**
 * Updates given replacements in XML file content.
 *
 * @param {string} content The file content.
 * @param {Array.<{key: string, value: string}>} replacements The replacement values.
 * @param {object} context The
 */
export const updateXml = (content: string, replacements: XmlReplacement[], context: PrepareContext): string => {
  let result = content;
  for (const replacement of replacements) {
    const key = escapeRegExp(replacement.key);
    const regex = new RegExp(`(<${key}>(.*)</${key}>)`);

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
 * Replaces the label value of a containerfile with the new version
 * @param content The file content.
 * @param label The name of the label to update.
 * @param context The semantic release context.
 * @returns The given content with the value of the given label replaced with the new version number.
 */
export const updateContainerfile = (content: string, label: string, context: PrepareContext): string => {
  const regex = new RegExp(`^(LABEL\\s+${escapeRegExp(label)}="v?).*(")$`, "m");

  if (!regex.test(content)) {
    context.logger.error(`Unable to match label ${label} in containerfile`);

    return content;
  }

  // Rebuild the line from its parts, replacing the old value by search would misplace an empty one.
  return content.replace(
    regex,
    (_match, prefix: string, suffix: string) => `${prefix}${context.nextRelease?.version}${suffix}`,
  );
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
