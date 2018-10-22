'use strict';

console.log('HLF Dev Server');
console.log(require('../package.json').version);
console.log('');

const rimraf = require('rimraf');
const path = require('path');

const argv = require('yargs')
  .command('serve [hlfv]', 'Start the Docker Servers for Hyperledger Fabric', (yargs) => {
    yargs
      .positional('hlfv', {
        describe: 'Hyperledger Fabric version',
        default: '1.2.0'
      })
  })
  .command('stop', 'Stop the Docker Servers')
  .command('clean', 'Stop & remove all data')
  .count('verbose')
  .alias('v', 'verbose')
  .describe('verbose','Verbosity log')
  .help('h')
  .argv;

const log = require('./utils/log');
const logLevel = (argv.verbose + 2) > 5 ? 5 : argv.verbose + 2;

switch (argv._[0]) {
  case 'serve':
      require('./docker').up(argv.hlfv, logLevel);
    break;
  case 'clean':
    require('./docker').down(logLevel).then(() => {
        rimraf(path.resolve(__dirname, '.cache'), (err) => {
            log.info('All clean :)');
        });
    });
    break;
  case 'stop':
      require('./docker').down(logLevel);
      break;
  default:
}
