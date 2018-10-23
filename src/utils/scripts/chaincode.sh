#!/bin/bash
set -e

Usage() {
	echo ""
	echo "Usage: ./chaincode.sh -n network [-v version] [-s] [-h]"
	echo ""
	echo "Options:"
	echo -e "\t-n, --network\t\t Network to update/install in fabric"
    echo -e "\t-v, --version\t\t (optional) version to update (default: patch)"
    echo -e "\t-s, --same-version\t (optional) Dont bump version"
    echo -e "\t-h, --help\t\t This help"
	echo ""
	echo "Example: ./chaincode.sh --network access --version prerelease"
	echo ""
	exit 1
}

Parse_Arguments() {
	while [ $# -gt 0 ]; do
		case $1 in
						--path | -p)
								shift
								NETPATH="$1"
								;;
            --network | -n)
                shift
                NETWORK="$1"
                ;;
            --version | -v)
                shift
                VERSION="$1"
                ;;
            --help | -h)
                HELPINFO=true
                ;;
            --same-version | -s)
                SAME=true
                ;;
		esac
		shift
	done
}

NETWORK=
VERSION="patch"
HELPINFO=
SAME=

Parse_Arguments $@
# echo "${NETWORK}";
# echo "${NETPATH}"
# echo "${VERSION}"
# echo "${SAME}"
# exit;
if [ "${HELPINFO}" == "true" ];then
    Usage
fi

if [ "${NETWORK}" == '' ]; then
    echo 'Network not set'
    Usage
fi

echo "Updating ${NETWORK}"
HERE="$(pwd)"
COMP=$(which composer)
# Grab the current directory
# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../${NET}" )"

cd ${NETPATH}
echo ${NETPATH}
if [ "${SAME}" != "true" ]; then
    # Bump version
    npm version ${VERSION}
# else
    # NEWVER=$(npm list --depth=0 | grep ${NET} | sed -e 's/.*\@//' -e 's/\/.*//' | tr -d '[:space:]')
    # echo ${NEWVER};
fi

NEWVER=$(npm list --depth=0 | grep ${NETWORK} | sed -e 's/.*\@//' -e 's/\/.*//' | tr -d '[:space:]')
echo ${NEWVER};

if [ ! -e dist/${NETWORK}.${NEWVER}.bna ]; then
    npm install
fi

echo "${COMP} network install -c PeerAdmin -a dist/${NETWORK}.${NEWVER}.bna"
${COMP} network install -c PeerAdmin -a dist/${NETWORK}.${NEWVER}.bna

CARD="local@${NETWORK}"

if ${COMP} network ping -c ${CARD} > /dev/null; then
    ${COMP} network upgrade -c PeerAdmin -n ${NETWORK} -V ${NEWVER}

else
    ${COMP} network start -c PeerAdmin -n ${NETWORK} -V ${NEWVER} -A admin -S adminpw -f new_bna.card

    if ${COMP} card list -c ${CARD} > /dev/null; then
        ${COMP} card delete -c ${CARD}
    fi

    ${COMP} card import -f new_bna.card -c ${CARD}
    rm new_bna.card

    ${COMP} network ping -c ${CARD}
fi

# Save docker ID
docker ps | grep dev-peer0.org1.example.com-${NETWORK}-$NEWVER | cut -c -12 >> ${HERE}/../../.cache/docker
