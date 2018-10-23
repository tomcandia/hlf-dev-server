'use strict';

/* eslint no-console: 0 */
console.log('HLF Dev Server');
console.log(require('../package.json').version);
console.log('');

const rimraf = require('rimraf');
const path = require('path');

const argv = require('yargs')
    .command(['up [hlfv]', 'serve', 'start'], 'Start the Docker Servers for Hyperledger Fabric', (yargs) => {
        yargs
            .positional('hlfv', {
                describe: 'Hyperledger Fabric version',
                default: '1.2.0'
            });
    })
    .command('user', 'Manage Users', (yargs) => {
        yargs.command('create', 'New user', (yargsCreate) => {
            yargsCreate
                .option('username', {
                    alias: 'u',
                    describe: 'User name (id)',
                    type: 'string',
                    nargs: 1,
                    demand: true,
                });
        });
    })
    .command('network', 'Manage Networks', (yargs) => {
        yargs.command('install', 'Install or Update network', (yargsInstall) => {
            yargsInstall
                .option('network', {
                    alias: 'n',
                    describe: 'path network directory to install/update (where package.json is)',
                    type: 'string',
                    nargs: 1,
                    demand: true
                })
                .option('network-version', {
                    alias: 't',
                    describe: 'version to install (referred to npm version)',
                    default: 'patch',
                    nargs: 1
                })
                .option('same-version', {
                    alias: 's',
                    describe: 'do not bump version (override network-version setting)',
                });
        });
    })
    .command('stop', 'Stop the Docker Servers')
    .command('clean', 'Stop & remove all data')
    .count('verbose')
    .alias('v', 'verbose')
    .describe('verbose','Verbosity log')
    .help('help')
    .alias('h', 'help')
    .argv;

const log = require('./utils/log');
const logLevel = (argv.verbose + 2) > 5 ? 5 : argv.verbose + 2;

const UserManager = require('./user');
const NetworkManager = require('./network');

switch (argv._[0]) {
case 'serve':
case 'up':
case 'start':
    require('./docker').up(argv.hlfv, logLevel);
    break;
case 'clean':
    require('./docker').down(logLevel).then(() => {
        rimraf(path.resolve(__dirname, '.cache'), () => {
            log.info('All clean :)');
        });
    });
    break;
case 'stop':
    require('./docker').down(logLevel);
    break;
case 'user':

    switch (argv._[1]) {
    case 'create':
        log.info('Registering user...');
        UserManager.register(argv.username);
        break;
    default:

    }

    break;
case 'network':
    switch (argv._[1]) {
    case 'install':
        NetworkManager.install(argv.network, argv.t, argv.s);
        break;
    default:

    }
    break;
default:
}
