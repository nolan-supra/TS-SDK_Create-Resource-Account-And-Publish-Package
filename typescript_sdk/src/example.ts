import fs from "fs";
import { BCS, HexString, SupraAccount, SupraClient, TxnBuilderTypes} from "supra-l1-sdk";
import { execSync } from "child_process";



//Gets the package metadata and module code from JSON payload (supra move tool build-publish-payload)
function getPackageData(filePath: string) {
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const packageMetadata = new HexString(jsonData.args[0].value).toUint8Array();
    const modulesCode = [];

    for(let e of jsonData.args[1].value){
      modulesCode.push(new HexString(e).toUint8Array())
    }
  
    return { packageMetadata, modulesCode };
}


//Compiles the package
async function compilePackage(packageName: string, namedAddresses: Array<{ name: string; address: string }>) {
  
    const namedAddressesArg = namedAddresses.map(({ name, address }) => `${name}=${address}`).join(",");

    const compileCommand = `docker exec supra_cli /supra/supra move tool build-publish-payload --json-output-file ./configs/move_workspace/${packageName}/output.json --package-dir /supra/configs/move_workspace/${packageName} --named-addresses ${namedAddressesArg} --assume-yes`;
    console.log('\nExecuting CLI command...');
    const data = execSync(compileCommand);
    console.log('CLI execution finished...\n')
  }

/*
* Deploys a package at a new resource account using 
* resource_account::create_resource_account_and_publish_package
* https://github.com/Entropy-Foundation/aptos-core/blob/b414eadb54e8e8722e58096f96dab17a11787646/aptos-move/framework/supra-framework/sources/resource_account.move#L124
*
* This example does the following...
* 1. Generates a new SupraAccount
* 2. Funds the new SupraAccount/Registers it on-chain
* 3. Derives the resource account address from source address (new SupraAccount) and optional seed
* 4. Sets the named addresses values according to addresses from steps 1 and 2.
* 5. Builds the publish payload and extracts the data from JSON output
* 6. Creates a raw txn object for resource_account::create_resource_account_and_publish_package
* 7. Submits the txn
*
* @param Path to the directory containing your move package that is bind mounted to supra_cli container. 
* Assuming you followed the guide, this is the /supra_configs directory on your host machine that contains your move_workspace
* https://docs.supra.com/move/getting-started/supra-cli-with-docker
*
* @param packageName The name of the package that you want to compile
* 
* @param namedAddresses An array of objects containing the named addresses to compile your project with.
* Please note that the code currently expects namedAddresses[0] is reservered for the source_addr and namedAddresses[1] is reserved for the derived resource account
*/
async function main(hostDirectory: string, packageName: string, namedAddresses: Array<{ name: string; address: string }>){

    //init supra client
    let supraClient = await SupraClient.init(
    "https://rpc-testnet.supra.com/"
    );

    //Init new supra account 
    //If you want to create account from PK or mnemonic: https://docs.supra.com/move/typescript-sdk/guides/create-supra-accounts
    let senderAccount = new SupraAccount();
    //Output supraAccount keys for example
    console.log(senderAccount.toPrivateKeyObject());

    //Fund with faucet to register on chain/fund for txn
    await supraClient.fundAccountWithFaucet(senderAccount.address())

    //Seed for resource account
    let seed = (new HexString("0000000000000000000000000000000000000000000000000000000000000000")).toUint8Array();
    
    //Derive resource account address
    let derivedResourceAccountAddress = SupraAccount.getResourceAccountAddress(senderAccount.address(), seed).toString();
    console.log(derivedResourceAccountAddress);

    //set the source_addr named-address
    namedAddresses[0].address = senderAccount.address().toString();
    //set the resourceAccount named-address
    namedAddresses[1].address = derivedResourceAccountAddress;

    //Compile Package
    await compilePackage(packageName, namedAddresses);

    //Get Package Data
    const { packageMetadata, modulesCode } = getPackageData(`${hostDirectory}/${packageName}/output.json`);

    //Serializer for code arg, pulled from SupraClient.publishPackage
    let codeSerializer = new BCS.Serializer();
    let modulesTypeCode: TxnBuilderTypes.Module[] = [];
    for (let i = 0; i < modulesCode.length; i++) {
      modulesTypeCode.push(
        new TxnBuilderTypes.Module(modulesCode[i])
      );
    }
    BCS.serializeVector(modulesTypeCode, codeSerializer);


    //Create TX Object
    let serializedRaw = await supraClient.createSerializedRawTxObject(
        new HexString(senderAccount.address().toString()),
        (await supraClient.getAccountInfo(senderAccount.address())).sequence_number,
        "0000000000000000000000000000000000000000000000000000000000000001",
        "resource_account",
        "create_resource_account_and_publish_package",
        [],
        [
          BCS.bcsSerializeBytes(seed), 
          BCS.bcsSerializeBytes(packageMetadata),codeSerializer.getBytes()
        ]
    )
    
    //Send the serialzed txn
    const txn = (
        await supraClient.sendTxUsingSerializedRawTransaction(
            senderAccount,
            serializedRaw
        )
    );

    //Output Txn
    console.log(txn);
    

}

//Set your own path to move_workspace (the folder that is bind mounted on your host device)
//https://docs.supra.com/move/getting-started/supra-cli-with-docker
main("C:/Users/Nolan/Documents/supra/supra_configs/move_workspace", "move_resource_example", [{name:"source_addr", address:"WILL_BE_SET_BY_FUNCTION"},{name: "resource_account", address: "WILL_BE_SET_BY_FUNCTION"}])