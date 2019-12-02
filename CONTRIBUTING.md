# Contributing

## Setup development prerequisites

- Install [Visual Studio Code](https://code.visualstudio.com/)

## Fork on GitHub

Before you do anything else, login on [GitHub](https://github.com/) and [fork](https://help.github.com/articles/fork-a-repo/) this repository

## Clone your fork locally

Install [Git](https://git-scm.com/) and clone your forked repository locally.

```sh
$ git clone https://github.com/<your-account>/soracom-napter-tools-vscode.git
```

## Play with your fork

The project uses [Semantic Versioning 2.0.0](http://semver.org/) but you don't have to update [`package.json`](package.json) as I will maintain release.

1. Open your terminal, navigate to local repository directory
2. Install dependencies
   ```sh
   $ yarn install # or npm install
   ```
3. Create a new topic branch
   ```sh
   $ git checkout -b add-new-feature
   ```
4. Modify source code
5. Launch vscode at your directory and press <kbd>F5</kbd> to compile and run the extension
   ```sh
   $ code .
   ```

## Open a pull request

1. Commit your changes locally, [rebase onto upstream/master](https://github.com/blog/2243-rebase-and-merge-pull-requests), then push the changes to GitHub
   ```sh
   $ git push origin add-new-feature
   ```
2. Go to your fork on GitHub, switch to your topic branch, then click "Compare and pull request" button.

## References

- Visual Studio Code
  - [Your First Extension | Visual Studio Code Extension API](https://code.visualstudio.com/api/get-started/your-first-extension)
- SORACOM
  - [SORACOM API 利用ガイド](https://dev.soracom.io/jp/docs/api_guide/) (Japanese) / [Soracom API Usage Guide](https://developers.soracom.io/en/docs/tools/api-reference/) (English)
  - [API リファレンス | SORACOM Developers](https://dev.soracom.io/jp/docs/api/) (Japanese) / [API Reference | SORACOM Developers](https://developers.soracom.io/en/api/#/) (English)
