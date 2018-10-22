'use strict';

// const { Docker } = require('node-docker-api');
const compose  = require('docker-compose');
const { uname } = require('node-uname');
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const sleep = require('./utils/sleep');
const log = require('./utils/log');
const composer = require('./composer/composer');

process.env.ARCH = uname().machine;

function execDocker(container, command, options) {
  return new Promise((resolve, reject) => {

    const childProc = childProcess.exec('docker exec ' + container + ' ' + command, {
      cwd: options.cwd
    });

    childProc.on('error', err => {
      reject(err)
    });

    childProc.on('close', () =>{
      resolve();
    });

    if(options.log) {
      childProc.stdout.pipe(process.stdout);
      childProc.stderr.pipe(process.stderr);
    }
  });
}

function createCacheFiles(cacheDir, cacheFile) {
    return new Promise((resolve, reject) => {
        fs.lstat(cacheDir, (error, statDir) => {
            if(!statDir || !statDir.isDirectory()) {
                fs.mkdir(cacheDir);
            }

            fs.stat(cacheFile, (error, stat) => {
                if(stat) {
                    fs.unlinkSync(cacheFile);
                }
                resolve();
            });
        });
    });
}

module.exports = {

    up: async (version, logLevel) => {
        log.info('Start HLF v' + version);

        const hlfv = path.resolve(__dirname, 'hlfv', version);
        const opt = {cwd: path.join(hlfv), log: (logLevel > 4)};

        await compose.upAll(opt);
        log.info('Docker up!');

        const cacheDir = path.join(__dirname, '.cache');
        const cacheFile = path.join(cacheDir, 'pathToDockerComposeFile');
        await createCacheFiles(cacheDir, cacheFile);

        fs.writeFileSync(cacheFile, path.join(hlfv));
        log.info('sleeping for 10 seconds to wait for fabric to complete start up');

        await sleep(10000);

        log.info('I woke up!');
        log.info('creating and joining channel ');

        await execDocker('peer0.org1.example.com', 'peer channel create -o orderer.example.com:7050 -c composerchannel -f /etc/hyperledger/configtx/composer-channel.tx', opt);
        await execDocker('-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com', 'peer channel join -b composerchannel.block', opt);

        log.info('sleeping for another 5 seconds to wait for fabric to set up');
        await sleep(5000);

        log.info('I\'m up!');
        log.info('Create composer card for Admin');
        await composer.createPeerAdmin();

        log.info('Enroll Admin');

        await composer.enrollAdmin(cacheDir);

        log.info('All Done!');
  },

  down: async (logLevel) => {
      log.info('Stoping servers...');
      try {
          const cacheFile = await fs.readFileSync(path.join(__dirname, '.cache', 'pathToDockerComposeFile'), 'utf-8');
          await compose.down({cwd: cacheFile, log: (logLevel > 4)});
          log.info('Done!');

      } catch(e) {
          log.info('Nothing to do here...');
      }

  }

}
