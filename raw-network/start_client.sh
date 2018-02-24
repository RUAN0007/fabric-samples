# Copy the chaincode/*.go directory under $GOPATH/src/
# Copy ustore conf to current directory

export CORE_VM_ENDPOINT=unix:///var/run/docker.sock
export CORE_LOGGING_LEVEL=DEBUG
export CORE_PEER_ID=cli
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=/home/ruanpingcheng/Desktop/fabric-samples/raw-network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_CHAINCODE_KEEPALIVE=10
export CORE_CHAINCODE_LOGGING_LEVEL=DEBUG
export CORE_CHAINCODE_LOGGING_SHIM=DEBUG

peer chaincode install -n smallbank -v 1.0 -p chaincode/smallbank

peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n smallbank -v 1.0 -c '{"Args":[""]}' -P "OR ('Org1MSP.member','Org2MSP.member')"

peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n smallbank -c '{"Args":["updateBalance","A","10"]}'
# key: smallbank_checking_A
# val: 100010
# blk_idx: 
# txn: 
# dep_read:[]


peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n smallbank -c '{"Args":["updateBalance","A","30"]}'
# key: smallbank_checking_A
# val: 100040
# blk_idx: 
# txn: 
# dep_read:[smallbank_checking_A]

peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n smallbank -c '{"Args":["updateBalance","B","50"]}'
# key: smallbank_checking_B
# val: 100050
# blk_idx: 
# txn: 
# dep_read:[]


peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n smallbank -c '{"Args":["sendPayment", "A", "B","200"]}'
# key: smallbank_checking_A
# val: 99840
# blk_idx: 
# txn: 
# dep_read:[smallbank_checking_A, smallbank_checking_B]

# key: smallbank_checking_B
# val: 100250
# blk_idx: 
# txn: 
# dep_read:[smallbank_checking_A, smallbank_checking_B]



# peer chaincode install -n fabcar -v 1.0 -p chaincode/fabcar

# peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n fabcar -v 1.0 -c '{"Args":[""]}' -P "OR ('Org1MSP.member','Org2MSP.member')"

# peer chaincode query -o orderer.example.com:7050 -C mychannel -n fabcar -c '{"Args":["initLedger"]}'

# peer chaincode query -o orderer.example.com:7050 -C mychannel -n fabcar -c '{"Args":["queryAllCars"]}'
