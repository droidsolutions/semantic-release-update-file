import AggregateError from "aggregate-error";
import fs from "fs";
import { access } from "fs/promises";
import { Config } from "semantic-release";
import { FILE_TYPE_CONTAINERFILE, FILE_TYPE_K8S, FILE_TYPE_XML, supportedFileTypes } from "./supportedFileTypes";
import { UserConfig } from "./UserConfig";

/**
 * Executes the verify step of the Semantic Release plugin.
 *
 * @param pluginConfig The Semantic Release configuration object including the configuration for this plugin.
 */
export const verify = async (pluginConfig: Config & UserConfig): Promise<void> => {
  const errors: Array<Error | string> = [];

  if (!pluginConfig.files || pluginConfig.files.length < 1) {
    errors.push(new Error("No files given, please configure at least one file to update."));
  } else {
    let index = -1;
    for (const file of pluginConfig.files) {
      index++;
      if (!file.type) {
        errors.push(`Invalid config, no type for file at index ${index} is set!`);
      }

      if (!supportedFileTypes.includes(file.type)) {
        errors.push(`Invalid config, type "${file.type}" for file at index ${index} is not supported!`);
      }

      if (file.type === FILE_TYPE_K8S && !file.image) {
        errors.push(`File at index ${index} has type ${FILE_TYPE_K8S} but no image name is set.`);
      }

      if (file.type === FILE_TYPE_XML) {
        if (!file.replacements) {
          errors.push("XML files must be given replacements!");
        } else if (!Array.isArray(file.replacements)) {
          errors.push("XML file replacements must be an array!");
        } else {
          for (const rp of file.replacements) {
            if (
              !Object.prototype.hasOwnProperty.call(rp, "key") ||
              !Object.prototype.hasOwnProperty.call(rp, "value")
            ) {
              errors.push("Each XML file replacement must have a key and a value set!");
              break;
            }
          }
        }
      }

      if (file.type === FILE_TYPE_CONTAINERFILE && !file.label) {
        errors.push("Containerfiles need a label to be replaced.");
      }

      if (!file.path) {
        errors.push(`Invalid config, no path for file at index ${index} is set!`);

        continue;
      }

      for (const filepath of Array.isArray(file.path) ? file.path : [file.path]) {
        try {
          // check if we can read and write the file
          await access(filepath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (err) {
          errors.push(new Error(`No write access to the file "${filepath}".`));
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
