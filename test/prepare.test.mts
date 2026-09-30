import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrepareContext } from "semantic-release";
import { prepare } from "../lib/prepare.mjs";

chai.use(chaiAsPromised);

describe("prepare", function () {
  let context: PrepareContext;
  let dir: string;

  const createFile = async (name: string, content: string): Promise<string> => {
    const path = join(dir, name);
    await writeFile(path, content);

    return path;
  };

  const readContent = async (path: string): Promise<string> => (await readFile(path)).toString();

  beforeEach(async function () {
    dir = await mkdtemp(join(tmpdir(), "semantic-release-update-file-"));
    context = {
      env: {},
      logger: {
        error: (_msg: string, ..._args: any[]) => undefined,
        log: (_msg: string, ..._args: any[]) => undefined,
      } as any,
      branch: { name: "main" },
      lastRelease: {
        version: "1.0.0",
        gitHead: "a",
        gitTag: "v1.0.0",
      },
      nextRelease: {
        gitHead: "b",
        gitTag: "v1.1.0",
        notes: "",
        type: "minor",
        version: "1.1.0",
      },
    } as PrepareContext;
  });

  afterEach(async function () {
    await rm(dir, { recursive: true, force: true });
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
      .expect(prepare({} as any, { ...context, lastRelease: undefined } as any))
      .to.be.rejectedWith(
        "Unable to update file contents because Semantic Release context has no release information.",
      );
  });

  it("should throw an Error if file branch is set and context has no branch info", async function () {
    await chai
      .expect(
        prepare({ files: [{ type: "k8s", branches: ["master"], image: "a", path: "b" }] }, {
          ...context,
          branch: undefined,
        } as any),
      )
      .to.be.rejectedWith("Unable to check branch because Semantic Release context has no branch information.");
  });

  it("should throw an Error if file branch is set and context has no branch name", async function () {
    await chai
      .expect(
        prepare({ files: [{ type: "k8s", branches: "master", image: "a", path: "b" }] }, {
          ...context,
          branch: {},
        } as PrepareContext),
      )
      .to.be.rejectedWith("Unable to check branch because Semantic Release context has no branch information.");
  });

  it("should not update file when branch is specified and does not equal current branch", async function () {
    const content = "image: registry/app:v1.0.0";
    const path = await createFile("deployment.yaml", content);

    await prepare({ files: [{ type: "k8s", branches: ["master"], image: "registry/app", path }] }, context);

    chai.expect(await readContent(path)).to.equal(content);
  });

  it("should update file when branch is specified and equals current branch", async function () {
    const path = await createFile("deployment.yaml", "image: registry/app:v1.0.0");

    await prepare({ files: [{ type: "k8s", branches: "main", image: "registry/app", path }] }, context);

    chai.expect(await readContent(path)).to.equal("image: registry/app:v1.1.0");
  });

  it("should update image tags in k8s files", async function () {
    const path = await createFile(
      "deployment.yaml",
      `containers:
  - image: registry/api:v1.0.0
  - image: registry/worker:v1.0.0
  - image: registry/other:v3.2.1`,
    );

    await prepare({ files: [{ type: "k8s", image: ["registry/api", "registry/worker"], path }] }, context);

    chai.expect(await readContent(path)).to.equal(`containers:
  - image: registry/api:v1.1.0
  - image: registry/worker:v1.1.0
  - image: registry/other:v3.2.1`);
  });

  it("should only update image tags matching the last release when exactMatch is set", async function () {
    const path = await createFile(
      "deployment.yaml",
      `containers:
  - image: registry/api:v1.0.0
  - image: registry/api:v0.9.0`,
    );

    await prepare({ files: [{ type: "k8s", image: "registry/api", path, exactMatch: true }] }, context);

    chai.expect(await readContent(path)).to.equal(`containers:
  - image: registry/api:v1.1.0
  - image: registry/api:v0.9.0`);
  });

  it("should update tags in xml files", async function () {
    const path = await createFile(
      "Directory.Build.props",
      `<Project>
  <PropertyGroup>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>`,
    );

    await prepare(
      { files: [{ type: "xml", path, replacements: [{ key: "Version", value: "${nextRelease.version}" }] }] },
      context,
    );

    chai.expect(await readContent(path)).to.equal(`<Project>
  <PropertyGroup>
    <Version>1.1.0</Version>
  </PropertyGroup>
</Project>`);
  });

  it("should update version in pubspec.yaml files", async function () {
    const path = await createFile("pubspec.yaml", "name: app\nversion: 1.0.0+5\n");

    await prepare({ files: [{ type: "flutter", path }] }, context);

    chai.expect(await readContent(path)).to.equal("name: app\nversion: 1.1.0+6\n");
  });

  it("should update label in containerfiles", async function () {
    const path = await createFile(
      "Containerfile",
      'FROM alpine:latest\nLABEL org.opencontainers.image.version="v1.0.0"\n',
    );

    await prepare({ files: [{ type: "containerfile", path, label: "org.opencontainers.image.version" }] }, context);

    chai
      .expect(await readContent(path))
      .to.equal('FROM alpine:latest\nLABEL org.opencontainers.image.version="v1.1.0"\n');
  });

  it("should update every path of a file entry", async function () {
    const first = await createFile("first.csproj", "<Version>1.0.0</Version>");
    const second = await createFile("second.csproj", "<Version>1.0.0</Version>");

    await prepare(
      {
        files: [
          { type: "xml", path: [first, second], replacements: [{ key: "Version", value: "${nextRelease.version}" }] },
        ],
      },
      context,
    );

    chai.expect(await readContent(first)).to.equal("<Version>1.1.0</Version>");
    chai.expect(await readContent(second)).to.equal("<Version>1.1.0</Version>");
  });
});
