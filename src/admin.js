const AdminConnection = require('composer-admin').AdminConnection;
const cardStore = require('composer-common').NetworkCardStoreManager.getCardStore({ type: 'composer-wallet-filesystem' });
const {Certificate, IdCard } = require('composer-common');

const Client = require('fabric-client');
const CaClient = require('fabric-ca-client');

const path = require('path');
const fs = require('fs');

const log = require('./utils/log');

const connectionProfile = {
    'name': 'testDC',
    'x-type': 'hlfv1',
    'x-commitTimeout': 300,
    'version': '1.0.0',
    'client': {
        'organization': 'Org1',
        'connection': {
            'timeout': {
                'peer': {
                    'endorser': '300',
                    'eventHub': '300',
                    'eventReg': '300'
                },
                'orderer': '300'
            }
        }
    },
    'channels': {
        'composerchannel': {
            'orderers': [
                'orderer.example.com'
            ],
            'peers': {
                'peer0.org1.example.com': {}
            }
        }
    },
    'organizations': {
        'Org1': {
            'mspid': 'Org1MSP',
            'peers': [
                'peer0.org1.example.com'
            ],
            'certificateAuthorities': [
                'ca.org1.example.com'
            ]
        }
    },
    'orderers': {
        'orderer.example.com': {
            'url': 'grpc://localhost:7050'
        }
    },
    'peers': {
        'peer0.org1.example.com': {
            'url': 'grpc://localhost:7051',
            'eventUrl': 'grpc://localhost:7053'
        }
    },
    'certificateAuthorities': {
        'ca.org1.example.com': {
            'url': 'http://localhost:7054',
            'caName': 'ca.org1.example.com'
        }
    }
};

module.exports = {

    createPeerAdmin: async () => {
        const cert = new Certificate(fs.readFileSync(path.resolve(__dirname, 'hlfv','composer/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'), 'utf8'));
        const credentials = {
            certificate: cert.pem,
            privateKey: fs.readFileSync(path.resolve(__dirname, 'hlfv', 'composer/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/114aab0e76bf0c78308f89efc4b8c9423e31568da0c340ca187a9b17aa9a4457_sk'), 'utf8')
        };
        // Identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: [ 'PeerAdmin', 'ChannelAdmin' ]
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);
        const deployerCardName = 'PeerAdmin';

        const adminConnection = new AdminConnection({ cardStore: cardStore });

        if(await adminConnection.hasCard(deployerCardName)) {
            log.debug('Card exists so... deleting');
            await adminConnection.deleteCard(deployerCardName);
        }
        await adminConnection.importCard(deployerCardName, deployerCard);
    },

    enrollAdmin: async (storePathDir) => {

        const client = new Client();
        const store_path = path.join(storePathDir, 'hfc-key-store');

        let admin_user;

        const state_store = await Client.newDefaultKeyValueStore({path: store_path});

        // assign the store to the fabric client
        client.setStateStore(state_store);
        const crypto_suite = Client.newCryptoSuite();
        // use the same location for the state store (where the users' certificate are kept)
        // and the crypto store (where the users' keys are kept)
        const crypto_store = Client.newCryptoKeyStore({path: store_path});
        crypto_suite.setCryptoKeyStore(crypto_store);
        client.setCryptoSuite(crypto_suite);

        const tlsOptions = {
        	trustedRoots: [],
        	verify: false
        };
        // be sure to change the http to https when the CA is running TLS enabled
        const fabric_ca_client = new CaClient('http://localhost:7054', tlsOptions , 'ca.org1.example.com', crypto_suite);

        // first check to see if the admin is already enrolled
        const user_from_store = await client.getUserContext('admin', true);

        if (user_from_store && user_from_store.isEnrolled()) {
            log.debug('Successfully loaded admin from persistence');
            admin_user = user_from_store;
        } else {

            try {

                // need to enroll it with CA server
                const enrollment = await fabric_ca_client.enroll({
                    enrollmentID: 'admin',
                    enrollmentSecret: 'adminpw'
                });

                log.debug('Successfully enrolled admin user "admin"');
                admin_user = await client.createUser({
                    username: 'admin',
                    mspid: 'Org1MSP',
                    cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
                });

                await client.setUserContext(admin_user);

            } catch(err) {
                log.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
                throw new Error('Failed to enroll admin');
            }

        }

        log.debug('Assigned the admin user to the fabric client ::' + admin_user._name);
    }

};
