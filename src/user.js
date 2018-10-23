'use strict';

const Client = require('fabric-client');
const CAClient = require('fabric-ca-client');

const path = require('path');
const fs = require('fs');

const log = require('./utils/log');

module.exports = {

    register: async (user) => {
        const client = new Client();
        const store_path = path.join(__dirname, '.cache', 'hfc-key-store');

        try {
            const state_store = await Client.newDefaultKeyValueStore({path: store_path});

            // assign the store to the fabric client
            client.setStateStore(state_store);
            const crypto_suite = Client.newCryptoSuite();
            // use the same location for the state store (where the users' certificate are kept)
            // and the crypto store (where the users' keys are kept)
            const crypto_store = Client.newCryptoKeyStore({path: store_path});
            crypto_suite.setCryptoKeyStore(crypto_store);
            client.setCryptoSuite(crypto_suite);
            // const tlsOptions = {
            // 	trustedRoots: [],
            // 	verify: false
            // };
            // be sure to change the http to https when the CA is running TLS enabled
            const fabric_ca_client = new CAClient('http://localhost:7054', null , '', crypto_suite);

            // first check to see if the admin is already enrolled
            let admin_user;
            const user_from_store = await client.getUserContext('admin', true);

            if (user_from_store && user_from_store.isEnrolled()) {
                log.debug('Successfully loaded admin from persistence');
                admin_user = user_from_store;
            } else {
                throw new Error('Failed to get admin....');
            }

            // at this point we should have the admin user
            // first need to register the user with the CA server
            const secret = await fabric_ca_client.register({enrollmentID: user, affiliation: 'org1.department1',role: 'client'}, admin_user);

            // next we need to enroll the user with CA server
            log.info('Successfully registered '+user+' - secret: '+ secret);
            const enrollment = await fabric_ca_client.enroll({enrollmentID: user, enrollmentSecret: secret});

            log.debug('Successfully enrolled member user "'+user+'" ');
            const member_user = await client.createUser({
                username: user,
                mspid: 'Org1MSP',
                cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
            });

            await client.setUserContext(member_user);

            log.info(user + 'was successfully registered and enrolled and is ready to intreact with the fabric network');
            const userJSON = JSON.parse(fs.readFileSync(store_path + '/' + user, 'utf8'));
            userJSON.enrollmentSecret = secret;
            fs.writeFileSync(store_path + '/' + user + '.pem', userJSON.enrollment.identity.certificate);
            fs.writeFileSync(store_path + '/' + user + '_pv', fs.readFileSync(store_path + '/' + userJSON.enrollment.signingIdentity + '-priv', 'utf8'));
            fs.writeFileSync(store_path + '/' + user, JSON.stringify(userJSON));

        } catch(err) {
            log.error('Failed to register: ' + err);
        	if(err.toString().indexOf('Authorization') > -1) {
        		log.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
        		'Try again after deleting the contents of the store directory '+store_path);
        	}
        }
    }

};
