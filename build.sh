#! /bin/bash
rm -rf builds
mkdir "builds"
cd builds
zip commercial-cmp-tcfv.zip ../src/cmp_tcfv2.js
zip commercial-cmp-ccpa.zip ../src/cmp_ccpa.js
zip commercial-cmp-aus.zip ../src/cmp_aus.js
