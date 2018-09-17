#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const minimist = require('minimist');
const { getAria2 } = require('../src');
const chmod = require('chmod');

const chmod_platforms = Object.freeze(['darwin', 'linux', 'android']);

(async () => {
    let argv = minimist(process.argv.slice(2));

    let destination = argv._[0];
    let platform = argv.p || argv.platform;
    let arch = argv.a || argv.arch;
    let doChmod = Boolean(argv.c || argv['chmod']);
    let writeExt = Boolean(argv.e || argv['ext']);
    let quiet = Boolean(argv.q || argv['quiet']); 

    let destinationStream = process.stdout;
    if (destination)
        destinationStream = fs.createWriteStream(destination + ((writeExt && platform === 'win32') ? '.exe' : ''));

    try {
        if (destination && !quiet) console.log(`downloading the latest version of aria2`);
        let { binaryStream, version } = await getAria2(platform, arch);
        if (destination && !quiet) console.log(`downloaded aria2 version: ${version}`);
        let outStream = binaryStream.pipe(destinationStream);

        outStream.on('error', (error) => {
            console.error(error.message);
            process.exit(1);
        });

        outStream.on('finish', () => {
            if (destination && !quiet) console.log(`wrote aria2c to: ${destination}`);
            if (doChmod && destination && chmod_platforms.includes(platform || os.platform())) {
                chmod(destination, 777);
            }

            process.exit(0);
        });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
})();