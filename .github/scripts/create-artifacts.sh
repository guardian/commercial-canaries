#! /bin/bash

rm -rf builds
mkdir "builds"
cd builds

echo "Creating TCFV2 artifact..."
mkdir -p tcfv2/nodejs/node_modules
cd tcfv2
cp -r ../../src/utils nodejs/node_modules
cp ../../src/cmp_tcfv2.js nodejs/node_modules/cmp_tcfv2.js
cp ../../src/cmp_tcfv2_article.js nodejs/node_modules/pageLoadArticle.js
cp ../../src/cmp_tcfv2_front.js nodejs/node_modules/pageLoadFront.js
zip -r nodejs.zip nodejs
rm -rf nodejs
cd ..
echo "TCFV2 artifact created"

echo "Creating CCPA artifact..."
mkdir -p ccpa/nodejs/node_modules
cd ccpa
cp -r ../../src/utils nodejs/node_modules
cp ../../src/cmp_ccpa.js nodejs/node_modules/pageLoadFront.js
zip -r nodejs.zip nodejs
rm -rf nodejs
cd ..
echo "CCPA artifact created"

echo "Creating AUS artifact..."
mkdir -p aus/nodejs/node_modules
cd aus
cp -r ../../src/utils nodejs/node_modules
cp ../../src/cmp_aus.js nodejs/node_modules/pageLoadFront.js
zip -r nodejs.zip nodejs
rm -rf nodejs
cd ..
echo "AUS artifact created"
