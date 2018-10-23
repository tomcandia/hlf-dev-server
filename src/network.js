'use strict';
const child = require('child_process');
const path = require('path');
const log = require('./utils/log');

function execChaincode(networkPath, network, version, same) {
    return new Promise((resolve, reject) => {

        let args = '-n ' + network +' -p ' + networkPath;
        if(same) {
            args += ' -s';
        } else {
            args += ' -v ' + version;
        }

        const childProc = child.exec('./utils/scripts/chaincode.sh ' + args, {
            cwd: path.resolve(__dirname)
        });

        childProc.on('error', err => {
            reject(err);
        });

        childProc.on('close', () =>{
            resolve();
        });

        childProc.stdout.on('data', (d) => {
            log.debug(String(d));
        });

        childProc.stderr.on('data', (d) => {
            log.error(String(d));
        });

    });
}

module.exports = {

    install: async (network, version, same) => {
        const networkPath = path.resolve(network);
        const info = require(path.join(networkPath,'package.json'));

        log.info('Install/Update ' + network);
        await execChaincode(networkPath, info.name, version, same);
    }

};
