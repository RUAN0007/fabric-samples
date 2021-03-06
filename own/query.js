'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Hyperledger Fabric Sample Query Program
 */

var hfc = require('fabric-client');
var path = require('path');
const util = require('util')

var options = {
    wallet_path: path.join(__dirname, './creds'),
    user_id: 'PeerAdmin',
    channel_id: 'mychannel',
    chaincode_id: 'example_cc',
    network_url: 'grpc://localhost:7051',
};

var channel = {};
var client = null;

// Return the promise of provenance records and 
//   dependent read version of the asset of a specific version

// a list of two objects
//   the first is the provenance records
//   the second is the list of dependent reads and its version
function GetDependency(asset, block_num, tx_num) {
    return Promise.resolve().then(() => {
        console.log("Create a client and set the wallet location");
        client = new hfc();
        return hfc.newDefaultKeyValueStore({ path: options.wallet_path });
    }).then((wallet) => {
        console.log("Set wallet path, and associate user ", options.user_id, " with application");
        client.setStateStore(wallet);
        return client.getUserContext(options.user_id, true);
    }).then((user) => {
        console.log("Check user is enrolled, and set a query URL in the network");
        if (user === undefined || user.isEnrolled() === false) {
            throw new Error("User not defined, or not enrolled - error");
        }
        channel = client.newChannel(options.channel_id);
        channel.addPeer(client.newPeer(options.network_url));
        return;
    }).then(() => {
        return channel.queryBlock(block_num);
    }).then((block) => {
        // console.log("Retrieved txn: ");
        // console.log(util.inspect(block.data.data[0], false, null));

        var txn_num = block.data.data.length;
        // console.log("Getting Block: ", block, " with ", txn_num, " txns");
        if (txn_num <= tx_num) {
            throw new Error("Total number of transactions is less than the transaction idx");
        }

        // console.log("Retrieved txn: ");
        // console.log(util.inspect((block, false, null)));

        var actions = block.data.data[tx_num].payload.data.actions;
        if(actions.length !== 1) {
          throw new Error("Multiple action detected: ", actions.length);
        }

        // console.log("Retrieved action: ");
        // console.log(util.inspect(actions[0], false, null));

        var ns_rwsets = actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset

        var cc_rwset; // Read-write set for this chain code

        for (var rwset_id in ns_rwsets) {
            if (ns_rwsets[rwset_id].namespace === options.chaincode_id) {
               cc_rwset = ns_rwsets[rwset_id].rwset;
               break; 
            }
        }

        if (cc_rwset === undefined) {
            throw new Error("Chaincode " + options.chaincode_id + " does not enable provenance tracking. "); 
        } 

        var cc_readset = cc_rwset.reads;
        var cc_wrtset = cc_rwset.writes;

        // console.log(cc_wrtset);

        var provenance; // provenance records for the asset
        for (var wrt_id in cc_wrtset) {
            if (cc_wrtset[wrt_id].key == asset + "_prov") {
              provenance = JSON.parse(cc_wrtset[wrt_id].value);
              break; 
            }
        }

        if (provenance === undefined) {
          throw new Error("The provenance for asset " + asset + " is not found"); 
        } 


        // Start to get the version of the dependency reads
        var result = []
        var dependency_read_versions = []
        for (var dep_read_idx in provenance.DepReads) {
            var dep_read_asset = provenance.DepReads[dep_read_idx];
            for (var read_idx in cc_readset) {
                if (cc_readset[read_idx].key == dep_read_asset) {
                    dependency_read_versions.push(cc_readset[read_idx]);
                }
            }  // end for
        }  // end for

        return [provenance, dependency_read_versions];
    });
}


// Return the promise of provenance records and dependent read version of the latest asset
// a list of two objects
//   the first is the provenance records
//   the second is the list of dependent reads and its version
function GetLastestDependency(asset) {
    return Promise.resolve().then(() => {
        console.log("Create a client and set the wallet location");
        client = new hfc();
        return hfc.newDefaultKeyValueStore({ path: options.wallet_path });
    }).then((wallet) => {
        console.log("Set wallet path, and associate user ", options.user_id, " with application");
        client.setStateStore(wallet);
        return client.getUserContext(options.user_id, true);
    }).then((user) => {
        console.log("Check user is enrolled, and set a query URL in the network");
        if (user === undefined || user.isEnrolled() === false) {
            throw new Error("User not defined, or not enrolled - error");
        }
        channel = client.newChannel(options.channel_id);
        channel.addPeer(client.newPeer(options.network_url));
        return;
    }).then(() => {
        console.log("Make query");
        var transaction_id = client.newTransactionID();
        console.log("Assigning transaction_id: ", transaction_id._transaction_id);

        // queryCar - requires 1 argument, ex: args: ['CAR4'],
        // queryAllCars - requires no arguments , ex: args: [''],
        const request = {
            chaincodeId: options.chaincode_id,
            txId: transaction_id,
            fcn: 'latest_txn',
            args: [asset]
        };
        return channel.queryByChaincode(request);
    }).then((query_responses) => {
        if (query_responses[0] instanceof Error) {
            throw new Error("error from query = ", query_responses[0]);
        }
        console.log("returned from query");
        if (!query_responses.length) {
            console.error("No payloads were returned from query");
        } 

        if (query_responses.length > 1) {
            console.error("Only single payload is required from the query.")
        } 

        console.log("Latest Written tnx ID for ", asset, 
                    " is ", query_responses[0].toString());
        return query_responses[0].toString()
    }).then((last_wrt_txn_id) => {
        console.log("Make query for a transaction ", last_wrt_txn_id);
        return channel.queryTransaction(last_wrt_txn_id);
    }).then((processed_txn) => {
        console.log("returned from query");
        var validation_code = processed_txn.validationCode
        if(validation_code !== 0) {
          throw new Error("Invalid txn validation code", validation_code);
        }

        var actions = processed_txn.transactionEnvelope.payload.data.actions
        if(actions.length !== 1) {
          throw new Error("Multiple action detected: ", actions.length);
        }


        var ns_rwsets = actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset
        console.log("# of ns_rwsets: ", ns_rwsets.length)

        var cc_rwset; // Read-write set for this chain code

        for (var rwset_id in ns_rwsets) {
            if (ns_rwsets[rwset_id].namespace === options.chaincode_id) {
               cc_rwset = ns_rwsets[rwset_id].rwset;
               break; 
            }
        }

        if (cc_rwset === undefined) {
            throw new Error("Chaincode " + options.chaincode_id + " does not enable provenance tracking. "); 
        } 


        var cc_readset = cc_rwset.reads;
        var cc_wrtset = cc_rwset.writes;

        var provenance; // provenance records for the asset
        for (var wrt_id in cc_wrtset) {
            if (cc_wrtset[wrt_id].key == asset + "_prov") {
              provenance = JSON.parse(cc_wrtset[wrt_id].value);
              break; 
            }
        }

        if (provenance === undefined) {
          throw new Error("The provenance for asset " + asset + " is not found"); 
        } 

        // Start to get the version of the dependency reads
        var dependency_read_versions = []
        for (var dep_read_idx in provenance.DepReads) {
            var dep_read_asset = provenance.DepReads[dep_read_idx];
            for (var read_idx in cc_readset) {
                if (cc_readset[read_idx].key == dep_read_asset) {
                    dependency_read_versions.push(cc_readset[read_idx]);
                }
            }  // end for
        }  // end for

        return [provenance, dependency_read_versions];
    });
};

// GetLastestDependency('b').then((provenance) => {
//     console.log("Dependency for a: ", provenance);
// }).catch((err) => {
//     console.error("Caught Error", err);
// });


GetDependency('a', 1, 0).then((provenance) => {
     console.log("Dependency for a: ", provenance);
 }).catch((err) => {
    console.error("Caught Error", err);
});
