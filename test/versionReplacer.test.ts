import chai from "chai";
import { Context } from "semantic-release";
import Sinon, { SinonSpy } from "sinon";
import { updateContainerfile, updateK8sYaml, updatePubspecVersion, updateXml } from "../lib/versionReplacer";

describe("versionReplacer", function () {
  context("updateK8sYaml", function () {
    const sampleContent = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.8.2
          name: identity-provider`;

    it("should replace container image version", function () {
      const actual = updateK8sYaml(sampleContent, "my.registry.com/some/image", "3.0.0");

      const expected = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v3.0.0
          name: identity-provider`;
      chai.expect(actual).to.equal(expected);
    });

    it("should replace container image version with suffix", function () {
      const content = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.8.2-alpine
          name: identity-provider`;
      const actual = updateK8sYaml(content, "my.registry.com/some/image", "3.0.0", "2.8.2");

      const expected = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v3.0.0-alpine
          name: identity-provider`;
      chai.expect(actual).to.equal(expected);
    });

    it("should replace container image version with version suffix", function () {
      const content = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v4.0.0-beta.1-alpine
          name: identity-provider`;
      const actual = updateK8sYaml(content, "my.registry.com/some/image", "4.0.0-beta.2", "4.0.0-beta.1");

      const expected = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v4.0.0-beta.2-alpine
          name: identity-provider`;
      chai.expect(actual).to.equal(expected);
    });

    it("should replace all container image occurences", function () {
      const content = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.0.0-api
          name: backend
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.0.0-worker
          name: worker`;
      const actual = updateK8sYaml(content, "my.registry.com/some/image", "2.1.0", "2.0.0");

      const expected = `apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.1.0-api
          name: backend
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.1.0-worker
          name: worker`;
      chai.expect(actual).to.equal(expected);
    });

    it("should throw an error if image could not be matched", function () {
      chai
        .expect(() => updateK8sYaml(sampleContent, "my.registry.com/some/other", "2.8.2", "3.0.0"))
        .to.throw("Unable to match image and old version in yaml file.");
    });
  });

  context("updatePubspecVersion", function () {
    const sampleContent = `name: some-module
description: Some plugin for Flutter apps
version: 0.9.0
author: Stefan Ißmer <stefan.issmer@droidsolutions.de>
homepage: https://somewhere.on/line

environment:
  sdk: ">=2.2.0 <3.0.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^0.12.0+2

dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^4.1.1`;

    it("should replace version in pubspec.yaml", function () {
      const actual = updatePubspecVersion(sampleContent, "0.9.0", "1.0.0");

      const expected = `name: some-module
description: Some plugin for Flutter apps
version: 1.0.0
author: Stefan Ißmer <stefan.issmer@droidsolutions.de>
homepage: https://somewhere.on/line

environment:
  sdk: ">=2.2.0 <3.0.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^0.12.0+2

dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^4.1.1`;
      chai.expect(actual).to.equal(expected);
    });

    it("should throw an error if old version is not found", function () {
      chai
        .expect(() => updatePubspecVersion(sampleContent, "0.8.0", "1.0.0"))
        .to.throw("Could not match old version in pubspec.yaml.");
    });
  });

  context("updateXml", function () {
    let context: Context & { branch: { name: string } };
    const sampleContent = `<PropertyGroup>
  <RepositoryBranch>dev</RepositoryBranch>
  <RepositoryCommit></RepositoryCommit>
  <VersionPrefix>0.9.0</VersionPrefix>
</PropertyGroup>`;
    before(function () {
      context = {
        nextRelease: { version: "1.0.0", gitHead: "", gitTag: "", notes: "", type: "minor" },
        logger: {
          error: Sinon.spy() as any,
          log: Sinon.spy() as any,
        },
        env: {
          CI_COMMIT_SHA: "997f96fd00c3898141b7fc10b1d53ba476a41017",
        },
        branch: { name: "master" },
      };
    });

    it("should set content of XML tag", function () {
      const actual = updateXml(
        sampleContent,
        [
          { key: "RepositoryBranch", value: "${branch.name}" },
          { key: "RepositoryCommit", value: "${CI_COMMIT_SHA}" },
          { key: "VersionPrefix", value: "${nextRelease.version}" },
        ],
        context,
      );

      const expected = `<PropertyGroup>
  <RepositoryBranch>master</RepositoryBranch>
  <RepositoryCommit>997f96fd00c3898141b7fc10b1d53ba476a41017</RepositoryCommit>
  <VersionPrefix>1.0.0</VersionPrefix>
</PropertyGroup>`;

      chai.expect(actual).to.equal(expected);
    });

    it("should log when key is not in xml file", function () {
      updateXml(
        sampleContent,
        [
          { key: "VersionPrefix", value: "${nextRelease.version}" },
          { key: "non-existant", value: " not-used" },
          { key: "RepositoryBranch", value: "${branch.test}" },
        ],
        context,
      );

      const errorSpy = context.logger.error as SinonSpy;
      chai.expect(errorSpy.callCount).to.equal(1);
      chai.expect(errorSpy.args.length).to.be.greaterThanOrEqual(1);
      chai.expect(errorSpy.args[0][0]).to.equal("Unable to match non-existant in xml file.");

      const logSpy = context.logger.log as SinonSpy;
      chai.expect(logSpy.callCount).to.equal(1);
      chai.expect(logSpy.args.length).to.be.greaterThanOrEqual(1);
      chai
        .expect(logSpy.args[0][0])
        .to.equal("Skipping replacement of key RepositoryBranch in xml file because value would be empty.");
    });
  });

  context("updateContainerfile", function () {
    let context: Context & { branch: { name: string } };
    const sampleContent = `FROM mcr.microsoft.com/dotnet/sdk:6.0 as build

LABEL maintainer="Stefan Ißmer | DroidSolutions GmbH <stefan.issmer@droidsolutions.de"
LABEL version="v1.1.0"

WORKDIR /source`;

    before(function () {
      context = {
        nextRelease: {
          version: "1.2.0",
          gitHead: "8d019d592c357f5db71cd585aacd39222e71a21e",
          gitTag: "v1.2.0",
          notes: "",
          type: "minor",
        },
        logger: {
          error: Sinon.spy() as any,
          log: Sinon.spy() as any,
        },
        env: {
          CI_COMMIT_SHA: "8d019d592c357f5db71cd585aacd39222e71a21e",
        },
        branch: { name: "master" },
      };
    });

    it("should replace version label", function () {
      const actual = updateContainerfile(sampleContent, "version", context);

      const expected = `FROM mcr.microsoft.com/dotnet/sdk:6.0 as build

LABEL maintainer="Stefan Ißmer | DroidSolutions GmbH <stefan.issmer@droidsolutions.de"
LABEL version="v1.2.0"

WORKDIR /source`;

      chai.expect(actual).to.equal(expected);
    });
  });
});
