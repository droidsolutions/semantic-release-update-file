import AggregateError from "aggregate-error";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FILE_TYPE_FLUTTER, FILE_TYPE_K8S, FILE_TYPE_XML } from "../lib/supportedFileTypes";
import { K8sFileSpec, UserConfig, XmlFileSpec } from "../lib/UserConfig";
import { verify } from "../lib/verify";

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
});
