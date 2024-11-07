import {
  type FILE_TYPE_CONTAINERFILE,
  type FILE_TYPE_FLUTTER,
  type FILE_TYPE_K8S,
  type FILE_TYPE_XML,
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
  /** If true, the exact version is replaced. */
  exactMatch?: boolean;
}

/** An XML file. */
export interface XmlFileSpec extends FileSpec {
  type: typeof FILE_TYPE_XML;
  /** A list of XML tags to set new values for. */
  replacements: XmlReplacement[];
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
export interface XmlReplacement {
  key: string;
  value: string;
}
