/* eslint-disable @typescript-eslint/no-explicit-any */
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs";
import { Context } from "semantic-release";
import sinon from "sinon";
import { prepare } from "../lib/prepare";
import { XmlReplacement } from "../lib/UserConfig";
import * as versionReplacer from "../lib/versionReplacer";

chai.use(chaiAsPromised);

describe("prepare", function () {
  let context: Context;
  let updateK8sYamlStub: sinon.SinonStub<
    [yamlContent: string, imageName: string, newVersion: string, oldVersion?: string],
    string
  >;
  let updateXmlStub: sinon.SinonStub<
    [
      content: string,
      replacements: XmlReplacement[],
      context: Context & {
        branch: { name: string };
      },
    ],
    string
  >;
  let updatePubspecStub: sinon.SinonStub<[pubspecContent: string, oldVersion: string, newVersion: string], string>;
  let updateContainerfileStub: sinon.SinonStub<[containerContent: string, label: string, context: Context], string>;

  before(function () {
    context = {
      env: {},
      logger: { error: (_msg, ..._args) => undefined, log: (_msg, ..._args) => undefined },
      lastRelease: {
        version: "v1.0.0",
        gitHead: "a",
        gitTag: "v1.0.0",
      },
      nextRelease: {
        gitHead: "b",
        gitTag: "v1.1.0",
        notes: "",
        type: "minor",
        version: "v1.1.0",
      },
    };

    updateK8sYamlStub = sinon.stub(versionReplacer, "updateK8sYaml");
    updateXmlStub = sinon.stub(versionReplacer, "updateXml");
    updatePubspecStub = sinon.stub(versionReplacer, "updatePubspecVersion");
    updateContainerfileStub = sinon.stub(versionReplacer, "updateContainerfile");
  });

  afterEach(function () {
    updateK8sYamlStub.reset();
    updateXmlStub.reset();
    updatePubspecStub.reset();
    updateContainerfileStub.reset();
  });

  after(function () {
    updateK8sYamlStub.restore();
    updateXmlStub.restore();
    updatePubspecStub.restore();
    updateContainerfileStub.restore();
  });

  it("should throw an Error if nextRelease is missing", async function () {
    await chai
      .expect(prepare({} as any, {} as any))
      .to.be.rejectedWith(
        "Unable to update file contents because Semantic Release context has no release information.",
      );
  });

  it("should throw an Error if lastRelease is missing", async function () {
    await chai
      .expect(
        prepare({} as any, {
          nextRelease: context.nextRelease,
          env: context.env,
          logger: context.logger,
          branch: { name: "main" },
        }),
      )
      .to.be.rejectedWith(
        "Unable to update file contents because Semantic Release context has no release information.",
      );
  });

  it("should throw an Error if file branch is set and context has no branch info", async function () {
    await chai
      .expect(
        prepare(
          {
            files: [{ type: "k8s", branches: ["master"], image: "a", path: "b" }],
          },
          context as Context & { branch: { name: string } },
        ),
      )
      .to.be.rejectedWith("Unable to check branch because Semantic Release context has no branch information.");
  });

  it("should throw an Error if file branch is set and context has no branch name", async function () {
    await chai
      .expect(
        prepare(
          {
            files: [{ type: "k8s", branches: "master", image: "a", path: "b" }],
          },
          {
            ...context,
            branch: {},
          } as Context & { branch: { name: string } },
        ),
      )
      .to.be.rejectedWith("Unable to check branch because Semantic Release context has no branch information.");
  });

  it("should not update file when branch is specified and does not equal current branch", async function () {
    await prepare(
      {
        files: [{ type: "k8s", branches: ["master"], image: "a", path: "b" }],
      },
      {
        ...context,
        branch: { name: "main" },
      },
    );

    expect(updateK8sYamlStub.callCount).to.equal(0);
  });

  it("should call the respecting versionReplacer for each file", async function () {
    const k8sFile = { path: "b/k8s.yaml", content: "image: a:v1.0.0", newContent: "image: a:v1.1.0", image: "a" };
    const pubspecFile = { path: "c/pubspec.yml", content: "version: v1.0.0", newContent: "version: v1.1.0" };
    const xmlFile = {
      path: "d/some.csproj",
      content: "<version>1.0.0</version>",
      replacements: [{ key: "Version", value: "${nextRelease.version}" }],
      newContent: "<version>1.1.0</version>",
    };
    const containerFile = {
      path: "e/Dockerfile",
      content: 'LABEL version="v1.0.0"',
      newContent: 'LABEL version="v1.1.0"',
    };

    updateK8sYamlStub.returns(k8sFile.newContent);
    updateXmlStub.returns(xmlFile.newContent);
    updatePubspecStub.returns(pubspecFile.newContent);
    updateContainerfileStub.returns(containerFile.newContent);

    const readFileStub = sinon.stub(fs.promises, "readFile");
    readFileStub.withArgs(k8sFile.path).resolves(k8sFile.content);
    readFileStub.withArgs(pubspecFile.path).resolves(pubspecFile.content);
    readFileStub.withArgs(xmlFile.path).resolves(xmlFile.content);
    readFileStub.withArgs(containerFile.path).resolves(containerFile.content);

    const writeFileStub = sinon.stub(fs.promises, "writeFile");
    writeFileStub.withArgs(k8sFile.path, k8sFile.newContent).resolves(undefined);
    writeFileStub.withArgs(pubspecFile.path, pubspecFile.newContent).resolves(undefined);
    writeFileStub.withArgs(xmlFile.path, xmlFile.newContent).resolves(undefined);
    writeFileStub.withArgs(containerFile.path, containerFile.newContent).resolves(undefined);

    const customContext = {
      ...context,
      branch: { name: "main" },
    };

    await prepare(
      {
        files: [
          { type: "k8s", branches: ["main"], image: k8sFile.image, path: k8sFile.path },
          { type: "flutter", branches: "main", path: pubspecFile.path },
          { type: "xml", path: xmlFile.path, replacements: xmlFile.replacements },
          { type: "containerfile", path: containerFile.path, label: "version" },
        ],
      },
      customContext,
    );

    expect(
      updateK8sYamlStub.calledOnceWithExactly(
        k8sFile.content,
        k8sFile.image,
        context.nextRelease?.version as string,
        undefined,
      ),
    ).to.be.true;
    expect(
      updatePubspecStub.calledOnceWithExactly(
        pubspecFile.content,
        context.lastRelease!.version,
        context.nextRelease!.version,
      ),
    ).to.be.true;
    expect(updateXmlStub.calledOnceWithExactly(xmlFile.content, xmlFile.replacements, customContext)).to.be.true;
    expect(updateContainerfileStub.calledOnceWithExactly(containerFile.content, "version", customContext)).to.be.true;
  });
});
