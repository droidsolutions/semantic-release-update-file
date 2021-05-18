# semantic-release-update-file

[**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to help with updating files during release.

[![main](https://github.com/droidsolutions/semantic-release-update-file/actions/workflows/main.yml/badge.svg)](https://github.com/droidsolutions/semantic-release-update-file/actions/workflows/main.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm (scoped)](https://img.shields.io/npm/v/@droidsolutions-oss/semantic-release-update-file)](https://www.npmjs.com/package/@droidsolutions-oss/semantic-release-update-file)

This plugin helps you to update files during a release which can be mainly helpful for updating Kubernetes manifests or using Semantic Release for projects with other languages than node such as Dotnet or Flutter.

| Step               | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `verifyConditions` | Verifies that the plugin is configured correctly and that the provided files are writable. |
| `prepare`          | Goes through each configured file and updates it.                                          |

## Install

```bash
npm install -D @droidsolutions-oss/semantic-release-update-file
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "release": {
    "gitlabUrl": "https://gitlab.droidnet.de",
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/changelog",
      "@semantic-release/release-notes-generator",
      "@semantic-release/npm",
      [
        "@droidsolutions/semantic-release-update-file",
        {
          "files": [
            {
              "path": ["k8s/prod/deployment.yaml"],
              "type": "k8s",
              "image": ["my.registry.com/some/image"],
              "branches": "main"
            },
            {
              "path": ["k8s/test/deployment.yaml"],
              "type": "k8s",
              "image": ["my.registry.com/some/image"],
              "branches": ["main", "develop"]
            },
            {
              "path": ["Directory.build.props"],
              "type": "xml",
              "replacements": [{ "key": "Version", "value": "${nextRelease.version}" }]
            }
          ]
        }
      ],
      [
        "@semantic-release/git",
        {
          "assets": [
            "package.json",
            "package-lock.json",
            "k8s/prod/deployment.yaml",
            "k8s/test/deployment.yaml",
            "CHANGELOG.md",
            "Directory.build.props"
          ],
          "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
        }
      ]
    ]
  }
}
```

With this example there will be 3 files updated:

- In the file `k8s/prod/deployment.yaml` the version of the image `my.registry.com/some/image` will be updated to the one Semantic Release calculated as the new version. This file will only be updated when the name of branch in which the release runs is `main`.
- The same applies to the file `k8s/test/deployment.yaml` but it will also be updated when the name of branch in which the release runs is `develop`.
- In the XML file `Directory.build.props` the value of the tag `Version` will be set to the version Semantic Release calculated as new.

Also the git plugin config is updated to include the changed files in the commit (so they can be user later).

For each file that should be updated you can specify it in the files property of the plugin. The options are described below.

### Configuration Options

#### path

This is a required field where you specify the path (relative to the root project directory) to the file that should be updated. This can be a string or an array of strings which would lead to all files beeing updated in the same way.

#### type

One of the supported file types. Currently these are `k8s` for yaml files, `flutter` for Dart `pubspec.yaml` files and `xml` for XML files like Dotnet project files.

#### branches

A filter to allow to change files based on the branch the release is run on. For example you might want to deploy to test from a different branch as to prod. In this case, you could set the files config like this:

```json
{
  "files": [
    {
      "path": ["k8s/prod/deployment.yaml"],
      "type": "k8s",
      "image": ["my.registry.com/some/image"],
      "branches": "main"
    },
    {
      "path": ["k8s/test/deployment.yaml"],
      "type": "k8s",
      "image": ["my.registry.com/some/image"],
      "branches": ["develop"]
    }
  ]
}
```

Branches can be a string or an array of branches, if you need to update the file in multiple branches (for example for pre-releases from alpha/beta/develop branches).

#### image

Only required if the type is `k8s`. Specifies the container image which version should be replaced. For example if you `deployment.yaml` looks like this:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - image: my.registry.com/some/image:v2.8.2
          name: my-deployment
```

You should specify `my.registry.com/some/image` as image in the configuration. After the Semantic Release run finished the version of the image will be the new version.

This is escpecially helpful if you build and publish the container image as part of another Semantic Release plugin and you want to deploy it in a later step of the CI pipeline.

#### replacements

Only required if type is `xml`. You can specify an array of key/value pairs that should be updated in the XML file. With this you can for example update the version and commit tags in a C# project file to for NuGet packages. For example consider the following .csproj file:

```xml
<Project>
  <PropertyGroup>
    <VersionPrefix>1.0.0</VersionPrefix>
    <Authors>Stefan Ißmer</Authors>
    <Company>DroidSolutions GmbH</Company>
    <Description>Awesome description of awesome NuGet package.</Description>
    <RepositoryUrl>git@example.git</RepositoryUrl>
    <RepositoryBranch>main</RepositoryBranch>
    <RepositoryCommit>2e5a8557392548f0c7463a102efdb0add0ee5aab</RepositoryCommit>
  </PropertyGroup>
</Project>
```

With the following configuration Semantic Release would update the VersionPrefix and the RepositoryCommit fields:

```json
{
  "files": [
    {
      "path": ["path/to/my.csproj"],
      "type": "xml",
      "replacements": [
        { "key": "VersionPrefix", "value": "${nextRelease.version}" },
        { "key": "RepositoryCommit", "value": "${nextRelease.gitHead}" }
      ]
    }
  ]
}
```

Now the VersionPrefix is up to date (and you could in a later Semantic Release step create a NuGet package with the version in the file) and the RepositoryCommit points to the commit that triggered the release.

The key must be a valid XML tag in the files you give. If it don't exist an error is logged but the execution of Semantic Release will continue. The value can be a fixed value as well as any object from the Semantic Release context which is extracted via a template function. This includes information about the last and the new release as well as Environment Variables you set yourself. For more information see [the documentation](https://semantic-release.gitbook.io/semantic-release/developer-guide/plugin#context).

## Development

To get started read the [Contribution guidelines](./CONTRIBUTING.md) first, make sure you have the prerequisites installed and then follow the steps below to set up your environment.

### Prerequisites

This project needs [NodeJS](https://nodejs.org/) installed on your machine.

### Set up develop environment

- clone this repo using git
- run `npm install` to fetch all dependencies
- run `npx husky install` to set up git hooks

### Transpile

Since this project is written in [TypeScript](https://www.typescriptlang.org/) you will need to transpile it into JavaScript files. This can be done with the `npm run build` command.

### Test

Tests are also written in TypeScript and use [Mocha](https://mochajs.org/) as test runner and the [Chai assertion library](https://www.chaijs.com/). If you add new features please also add unit tests that make sure the feature is working properly.