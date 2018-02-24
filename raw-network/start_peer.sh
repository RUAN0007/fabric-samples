export CORE_VM_ENDPOINT=unix:///var/run/docker.sock
export CORE_PEER_ID=peer0.org1.example.com
export CORE_LOGGING_PEER=debug
export CORE_CHAINCODE_LOGGING_LEVEL=DEBUG
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=/home/ruanpingcheng/Desktop/fabric-samples/raw-network/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_FILESYSTEMPATH=/tmp/hyperledger/production
export CORE_CHAINCODE_LOGGING_SHIM=DEBUG

peer node start