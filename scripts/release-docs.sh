#!/usr/bin/env bash
# This script generates HTML documentation for the current release and publishes it to the
# "gh-pages" branch of the current repository. The current repository should be the public one,
# and it must already have a "gh-pages" branch.

# It takes exactly one argument: the new version.
# It should be run from the root of this git repo like this:
#   ./scripts/release.sh 4.0.9

# The "docs" directory must contain a Makefile that will generate docs into "docs/build/html".
# It will receive the version string in the environment variable $VERSION (in case it is not
# easy for the documentation script to read the version directly from the project).

set -uxe
echo "Building and releasing documentation."

export VERSION=$1

PROJECT_DIR=$(pwd)
GIT_URL=$(git remote get-url origin)

TEMP_DIR=$(mktemp -d /tmp/sdk-docs.XXXXXXX)
DOCS_CHECKOUT_DIR=$TEMP_DIR/checkout

git clone -b gh-pages $GIT_URL $DOCS_CHECKOUT_DIR

cd $PROJECT_DIR/docs
make

cd $DOCS_CHECKOUT_DIR

git rm -r * || true
touch .nojekyll  # this turns off unneeded preprocessing by GH Pages which can break our docs
git add .nojekyll
cp -r $PROJECT_DIR/docs/build/html/* .
git add *
git commit -m "Updating documentation to version $VERSION"
git push origin gh-pages

cd $PROJECT_DIR
rm -rf $TEMP_DIR
