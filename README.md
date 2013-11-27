# About

Hatch-compound is CMS platform with social features. This package is just
express application which could be extended with additional modules. Any part of
this application accesible via [CompoundJS API][compound-api].

## Installation

    npm install
    gem install docsplit

on mac:

    brew install poppler

## Package Structure Overview

### ./index.js

Exports application server builder function. This is main entry point to
application. When you run `node .` or `compound server 3003` this file
automatically included.

### ./app

Hatch-compound is express app structurized with Compound MVC, so this is
standard directory structure for MVC app. It contains core models, controllers,
views, helpers, assets and mailers.

### [./lib][lib]

Hatch core. Contains API and core implementation.

### [./hatch_modules][modules]

Built-in modules for hatch. Each module is separate application mounted to root
application on `/do/{moduleName}` route.

### ./test

Before running tests ensure you have installed dev dependencies:

    npm install

Use `make test` command to run all tests. While debugging / TDD use `make
testing` command which is the same as previous, but with `--watch` flag. For
verbose output run `make test-verbose`.

Every piece of code should be tested (ideally). Make sure tests included in pull request.

## Workflow

We are using workflow similar to [gitflow][gitflow], general idea: make commit
for some feature development into separate branch, then publish it and make pull
request to the `master` branch. It is recommended to start feature branches with
`feature-` refix.

This project uses Makefile to organize workflow as easy as [1][pull], [2][feature], [3][pr]

### 1.1. `make pull`: pulling changes

To get changes from `origin` remote use:

    make pull

this command just does `git pull origin $current-branch` command.

### 1.2. `make update`: smart pulling changes

To pull changes and perform some additional stuff use:

    make update

it will pull changes, install dependencies and run tests.

### 1.3. `make safe-update`: safe pulling changes

To pull changes safely use:

    make safe-update

it will pull changes with --no-commit flag, update dependencies and then run
tests and only commit merge when nothing was broken in tests.

### 2. `make feature`: working on feature

Run this command before start working on new feature (before first commit):

    make feature name-of-thing

this command will create new branch named `feature-name-of-thing`.

### 3. `make pr`: make pull request

When feature is done, run

    make pr

command to create pull request in GitHub

[lib]: https://github.com/marcusgreenwood/hatch-compound/tree/master/lib
[modules]: https://github.com/marcusgreenwood/hatch-compound/tree/master/hatch_modules
[compound-api]: http://compoundjs.github.com/guides
[gitflow]: http://nvie.com/posts/a-successful-git-branching-model/
[pull]: https://github.com/marcusgreenwood/hatchjs/blob/master/README.md#11-make-pull-pulling-changes
[feature]: https://github.com/marcusgreenwood/hatchjs/blob/master/README.md#2-make-feature-working-on-feature
[pr]: https://github.com/marcusgreenwood/hatchjs/blob/master/README.md#3-make-pr-make-pull-request
