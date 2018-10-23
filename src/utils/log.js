'use strict';
const Winston = require('winston');
const argv = require('yargs').argv;
const logLevel = (argv.verbose + 2) > 5 ? 5 : argv.verbose + 2;
const levels = ['error', 'warn', 'info', 'verbose',  'debug', 'silly'];

module.exports = Winston.createLogger({
    format: Winston.format.combine(
        Winston.format.colorize(),
        Winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss'}),
        Winston.format.align(),
        Winston.format.splat(),
        Winston.format.simple(),
        Winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`),
    ),
    level: levels[logLevel],
    transports: [new Winston.transports.Console()]
});
