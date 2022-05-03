import {
  FILE_TYPE_CONTAINERFILE,
  FILE_TYPE_FLUTTER,
  FILE_TYPE_K8S,
  FILE_TYPE_XML,
  SupportedFileTypes,
} from "./supportedFileTypes";

/** Possible configuration for the plugin. */
export interface UserConfig {
  /** A list of files to update during release. */
  files: Array<K8sFileSpec | XmlFileSpec | FlutterFileSpec | ContainerFileSpec>;
}

/** Base spec for all files. */
export interface FileSpec {
  /** The type of the file. */
  type: SupportedFileTypes;
  /** The relative path to the file from the repository root. */
  path: string | string[];
  /** An optional branch filter. */
  branches?: string | string[];
}

/** A Kubernetes manifest file. */
export interface K8sFileSpec extends FileSpec {
  type: typeof FILE_TYPE_K8S;
  /** The name of the image to update in the manifest. */
  image: string | string[];
}

/** An XML file. */
export interface XmlFileSpec extends FileSpec {
  type: typeof FILE_TYPE_XML;
  /** A list of XML tags to set new values for. */
  replacements: Array<XmlReplacement>;
}

/** A pubspec.yaml file. */
export interface FlutterFileSpec extends FileSpec {
  type: typeof FILE_TYPE_FLUTTER;
}

/** A containerfile */
export interface ContainerFileSpec extends FileSpec {
  type: typeof FILE_TYPE_CONTAINERFILE;
  /** The label to replace. */
  label: string;
}

/** A key/value pair for XML file replacements. */
export type XmlReplacement = { key: string; value: string };
