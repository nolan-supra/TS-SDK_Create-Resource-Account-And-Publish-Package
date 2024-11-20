This is an SDK example for calling the following method:
`resource_account::create_resource_account_and_publish_package`

https://github.com/Entropy-Foundation/aptos-core/blob/b414eadb54e8e8722e58096f96dab17a11787646/aptos-move/framework/supra-framework/sources/resource_account.move#L124

This example does the following...
* Generates a new SupraAccount
* Funds the new SupraAccount/Registers it on-chain
* Derives the resource account address from source address (new SupraAccount) and unique seed
* Sets the named addresses values according to addresses from steps 1 and 2.
* Builds the publish payload and extracts the data from JSON output
* Creates a raw txn object for resource_account::create_resource_account_and_publish_package
* Submits the txn



# To Test:

1: follow the getting started guide to install/setup CLI with docker (https://docs.supra.com/move/getting-started)

2: move the `move_resource_example` package of this repo into your `move_workspace` directory within the bind mounted directory on the host machine

3: Set path to your `move_workspace` on line 127 of `typescript_sdk/src/example.ts` (First parameter)

4: execute the typescript_sdk `npx ts-node typescript_sdk/src/example.ts`

## To call function/Check balance:

`supra move tool run --function-id RESOURCE_ADDR::simple_defi::exchange_to_entry --args u64:50000000 --url https://rpc-testnet.supra.com`

`supra move tool run --function-id RESOURCE_ADDR::simple_defi::exchange_from_entry --args u64:50000000 --url https://rpc-testnet.supra.com`

`https://rpc-testnet.supra.com/rpc/v1/accounts/{YOUR_ADDRESS}/resources/0x1::coin::CoinStore<{RESOURCE_ADR}::simple_defi::ChloesCoin>`
