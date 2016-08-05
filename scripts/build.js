const readFileSync = require('fs').readFileSync;
const execSync = require('child_process').execSync;
const inInstall = require('in-publish').inInstall;
const prettyBytes = require('pretty-bytes');
const gzipSize = require('gzip-size');

if (inInstall()) {
  process.exit(0);
}

function exec(command) {
  execSync(command, { stdio: 'inherit' });
}

exec('npm run build-lib');
exec('npm run build-min');

console.log(
  '\ngzipped, the UMD build is ' + prettyBytes(
    gzipSize.sync(readFileSync('dist/ldclient.min.js'))
  )
);
