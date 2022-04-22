# How To Contribute

This repo is divided into multiple packages using Yarn workspaces:

- `addon` is the actual ember-page-title addon
- `test-app` is its test suite
- `docs` is the documentation/marketing site


## Installation

* `git clone https://github.com/ember-animation/ember-animated.git`
* `cd ember-animated`
* `pnpm install`

## Linting

Inside any of the packages you can run:

* `pnpm lint`
* `pnpm lint:fix`

## Running tests

* `cd addon && pnpm run start` – Builds the addon in "watch mode" so changes picked up by test app.
* `cd test-app && ember test` – Runs the test suite on the current Ember version
* `cd test-app && ember test --server` – Runs the test suite in "watch mode"
* `cd test-app && ember try:each` – Runs the test suite against multiple Ember versions

During development, if you'd like test app to pick up changes in the addon, make sure to run both
`cd addon && pnpm run start` and `cd test-app && ember test --server` in different terminals.

## Running the test application

* `cd test-app && ember serve`
* Visit the test application at [http://localhost:4200](http://localhost:4200).

## Running the documentation application

The docs are in a standalone app in the /docs subdirectory.

* `cd addon && pnpm run start` – Builds the addon in "watch mode" so changes picked up by the docs app.
* `cd docs && ember serve`
* Visit the docs application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
