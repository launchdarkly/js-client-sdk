#!/usr/bin/env bash
# This script updates the version for the js-client packages and releases them to npm.
# It requires you to have valid NPM credentials associated with the packages.

# It takes exactly one argument: the new version.
# It should be run from the root of this git repo like this:
#   ./scripts/release.sh 4.0.9

# When done you should commit and push the changes made.

set -uxe
echo "Starting js-client release."

VERSION=$1

PROJECT_DIR=`pwd`

# Make the lerna command available.

npm install

# Update version in all packages. Explanation of options:
#    --no-git-tag-version: lerna creates tags in the wrong format ("v2.0.0" instead of "2.0.0"). The
#        release job that calls this script will create a tag anyway.
#    --no-push: The release job takes care of committing and pushing.
#    -y: Suppresses interactive prompts.

./node_modules/.bin/lerna version $VERSION --no-git-tag-version --no-push -y

# Publish all packages.
#
# Supposedly, we should be able to do them all at once like so:
#    ./node_modules/.bin/lerna publish $VERSION --from-package --no-git-reset --no-git-tag-version -y
#
# However, we haven't been able to get that to work. The packages get built, but the tarballs uploaded
# to npm do not contain the build products. In other words, it is *not* equivalent to just running
# "npm publish" in each package directory. So, for now, we'll just do the latter.

for package in launchdarkly-js-sdk-common launchdarkly-js-client-sdk; do
  cd $PROJECT_DIR/packages/$package
  npm publish
done

cd $PROJECT_DIR
$PROJECT_DIR/scripts/release-docs.sh $VERSION

echo "Done with js-client release"
