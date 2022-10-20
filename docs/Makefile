
# The TypeDoc build for launchdarkly-js-client-sdk is more complicated than for ldclient-node because launchdarkly-js-client-sdks takes
# some of its types from launchdarkly-js-sdk-common. TypeDoc unfortunately does not understand the directive
# "export * from 'launchdarkly-js-sdk-common'" - so, by default, even though it does see the common types (like
# LDUser), it will not include them in the output.
#
# The current solution is to run TypeDoc on a hacked-together file that puts all of the types directly
# into one package. The sed commands below create this temporary declaration file by taking the types file
# from launchdarkly-js-client-sdk and replacing the launchdarkly-js-sdk-common imports with the actual contents of the
# launchdarkly-js-sdk-common module. We then run TypeDoc from the docs directory, which contains its own
# tsconfig.json that points to the temporarily file instead of the original files.
# 

.PHONY: html prepare

html: prepare
	../node_modules/.bin/typedoc --options typedoc.js
	mv before-typedoc-package.json ../package.json
	mv before-typedoc-package-lock.json ../package-lock.json
	if [ -n "$(LD_RELEASE_DOCS_DIR)" ]; then cp -r build/html/* "$(LD_RELEASE_DOCS_DIR)"; fi

prepare:
	cp ../package.json before-typedoc-package.json
	cp ../package-lock.json before-typedoc-package-lock.json
	cd .. && npm install "typedoc@0.23.17"
	rm -rf build
	mkdir build
	@# Extract the whole module declaration from launchdarkly-js-sdk-common, then remove the first and last lines
	sed -n '/^declare module/,/^}/p' ../node_modules/launchdarkly-js-sdk-common/typings.d.ts | \
		sed '1d;$$d' \
		>build/common-excerpt
	@# Replace the block from DOCBUILD-START-REPLACE to DOCBUILD-END-REPLACE with that excerpt
	sed -e '/DOCBUILD-END-REPLACE/r build/common-excerpt' ../typings.d.ts | \
		sed -e '/DOCBUILD-START-REPLACE/,/DOCBUILD-END-REPLACE/d' >build/typings.d.ts
