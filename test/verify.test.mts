import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  FILE_TYPE_CONTAINERFILE,
  FILE_TYPE_FLUTTER,
  FILE_TYPE_K8S,
  FILE_TYPE_XML,
} from "../lib/supportedFileTypes.mjs";
import type { K8sFileSpec, UserConfig, XmlFileSpec } from "../lib/UserConfig.mjs";
import { verify } from "../lib/verify.mjs";

chai.use(chaiAsPromised);

describe("verify", function () {
  it("should return an error when no files given", async function () {
    const config: Partial<UserConfig> = {};
    await chai
      .expect(verify(config as UserConfig))
      .to.be.rejectedWith(AggregateError, "No files given, please configure at least one file to update.");
  });

  it("should return an error when a file has no type", async function () {
    const config: UserConfig = {
      files: [{ path: "some/path" } as K8sFileSpec],
    };
    await chai
      .expect(verify(config))
      .to.be.rejectedWith(AggregateError, "Invalid config, no type for file at index 0 is set!");
  });

  it("should not report a missing type as unsupported type", async function () {
    const config: UserConfig = {
      files: [{ path: "some/path" } as K8sFileSpec],
    };

    const error = await chai.expect(verify(config)).to.be.rejectedWith(AggregateError);

    chai
      .expect((error as unknown as AggregateError).errors.map((e: Error) => e.message))
      .to.deep.equal([
        "Invalid config, no type for file at index 0 is set!",
        'No write access to the file "some/path".',
      ]);
  });

  it("should return an error when an unsupported type is set", async function () {
    const config: UserConfig = {
      files: [{ type: "wat", path: "some/path" } as unknown as K8sFileSpec],
    };
    await chai
      .expect(verify(config))
      .to.be.rejectedWith(AggregateError, 'Invalid config, type "wat" for file at index 0 is not supported!');
  });

  it("should return an error when file does not exist or is not writable", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_FLUTTER, path: "some/path" }],
    };
    await chai.expect(verify(config)).to.be.rejectedWith(AggregateError, 'No write access to the file "some/path".');
  });

  it("should return an error when file type is k8s but image config is missing", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_K8S, path: "some/path" } as K8sFileSpec],
    };
    await chai
      .expect(verify(config))
      .to.be.rejectedWith(AggregateError, `File at index 0 has type ${FILE_TYPE_K8S} but no image name is set.`);
  });

  it("should return an error when file type is xml and no replacements are set", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_XML, path: "some/path" } as XmlFileSpec],
    };
    await chai.expect(verify(config)).to.be.rejectedWith(AggregateError, "XML files must be given replacements!");
  });

  it("should return an error when file type is xml and replacements is not an array", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_XML, path: "some/path", replacements: 1 } as unknown as XmlFileSpec],
    };
    await chai.expect(verify(config)).to.be.rejectedWith(AggregateError, "XML file replacements must be an array!");
  });

  it("should return an error when file type is xml and a replacement has no key", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_XML, path: "some/path", replacements: [{ value: 1 }] } as unknown as XmlFileSpec],
    };
    await chai
      .expect(verify(config))
      .to.be.rejectedWith(AggregateError, "Each XML file replacement must have a key and a value set!");
  });

  it("should return an error when file type is xml and a replacement has no value", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_XML, path: "some/path", replacements: [{ key: "affe" }] } as unknown as XmlFileSpec],
    };
    await chai
      .expect(verify(config))
      .to.be.rejectedWith(AggregateError, "Each XML file replacement must have a key and a value set!");
  });

  it("should return an error when file type is containerfile and a label has no value", async function () {
    const config: UserConfig = {
      files: [{ type: FILE_TYPE_CONTAINERFILE, path: "some/path" } as unknown as XmlFileSpec],
    };
    await chai.expect(verify(config)).to.be.rejectedWith(AggregateError, "Containerfiles need a label to be replaced.");
  });

  it("should expose every problem as an Error in the errors property", async function () {
    const config: UserConfig = {
      files: [
        { type: FILE_TYPE_K8S, path: "some/path" } as K8sFileSpec,
        { type: FILE_TYPE_CONTAINERFILE, path: "other/path" } as unknown as XmlFileSpec,
      ],
    };

    const error = await chai.expect(verify(config)).to.be.rejectedWith(AggregateError);

    const errors = (error as unknown as AggregateError).errors as unknown[];
    chai.expect(errors).to.have.lengthOf(4);
    chai.expect(errors.every((e) => e instanceof Error)).to.equal(true);
    chai
      .expect(errors.map((e) => (e as Error).message))
      .to.deep.equal([
        `File at index 0 has type ${FILE_TYPE_K8S} but no image name is set.`,
        'No write access to the file "some/path".',
        "Containerfiles need a label to be replaced.",
        'No write access to the file "other/path".',
      ]);
  });
});
