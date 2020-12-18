#! /bin/bash
rm -rf builds
mkdir "builds"
cd builds
echo "Creating TCFV2 artfact..."
mkdir "commercial-cmp-tcfv"
mkdir commercial-cmp-tcfv/node_modules
cp ../src/cmp_tcfv2.js commercial-cmp-tcfv/node_modules/pageLoadBlueprint.js
zip -r commercial-cmp-tcfv.zip commercial-cmp-tcfv
rm -rf commercial-cmp-tcfv
echo "TCFV2 artifact created"

echo "Creating CCPA artfact..."
mkdir "commercial-cmp-ccpa"
mkdir commercial-cmp-ccpa/node_modules
cp ../src/cmp_ccpa.js commercial-cmp-ccpa/node_modules/pageLoadBlueprint.js
zip -r commercial-cmp-ccpa.zip commercial-cmp-ccpa
rm -rf commercial-cmp-ccpa
echo "TCFV2 artifact created"

echo "Creating AUS artifact..."
mkdir "commercial-cmp-aus"
mkdir commercial-cmp-aus/node_modules
cp ../src/cmp_aus.js commercial-cmp-aus/node_modules/pageLoadBlueprint.js
zip -r commercial-cmp-aus.zip commercial-cmp-aus
rm -rf commercial-cmp-aus
echo "AUS artifact created"

