
# The TypeDoc build for ldclient-js is more complicated than for ldclient-node because ldclient-js takes
# some of its types from ldclient-js-common. TypeDoc unfortunately does not understand the directive
# "export * from 'ldclient-js-common'" - so, by default, even though it does see the common types (like
# LDUser), it will not include them in the output.
#
# The current solution is to run TypeDoc on a hacked-together file that puts all of the types directly
# into one package. The sed commands below create this temporary declaration file by taking the types file
# from ldclient-js and replacing the section in between DOCBUILD-START-REPLACE and DOCBUILD-END-REPLACE
# with the section of the types file from ldclient-js-common in between DOCBUILD-START-EXCERPT and
# DOCBUILD-END-EXCERPT. We then run TypeDoc from the docs directory, which contains its own tsconfig.json
# that points to the temporarily file instead of the original files.
# 

.PHONY: html prepare

html: prepare
	../node_modules/.bin/typedoc --options typedoc.js

prepare:
	rm -rf build
	mkdir build
	sed -n '/DOCBUILD-START-EXCERPT/,/DOCBUILD-END-EXCERPT/p' ../packages/ldclient-js-common/typings.d.ts >build/common-excerpt
	sed -e '/DOCBUILD-END-REPLACE/r build/common-excerpt' ../packages/ldclient-js/typings.d.ts | \
		sed -e '/DOCBUILD-START-REPLACE/,/DOCBUILD-END-REPLACE/d' >build/typings.d.ts
