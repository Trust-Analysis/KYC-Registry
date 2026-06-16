import 'dotenv/config';
import { Contract, rpc, Networks, Keypair, TransactionBuilder, Address, Account, xdr } from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.CONTRACT_ID;
if (!CONTRACT_ID) {
  console.error("❌ ERROR: Missing CONTRACT_ID in environment variables");
  process.exit(1);
}

// Initialize the RPC server for Stellar Testnet
const server = new rpc.Server(process.env.RPC_URL || 'https://soroban-testnet.stellar.org');

const contract = new Contract(CONTRACT_ID);

/**
 * Read-only function to check if a user is verified
 */
async function checkUserVerification(userAddress) {
  try {
    // For read-only calls, we can use a randomly generated dummy account
    const dummyKeypair = Keypair.random();
    const account = new Account(dummyKeypair.publicKey(), "0");

    // 1. Build a basic transaction to invoke the smart contract
    const tx = new TransactionBuilder(account, {
      fee: "100", // Base fee, will be updated during preparation
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("is_verified", new Address(userAddress).toScVal()))
      .setTimeout(30)
      .build();
    
    // 2. Simulate the transaction to get the return value without committing it
    const simulated = await server.simulateTransaction(tx);
    if (simulated.error) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    // 3. Extract and parse the boolean result from the returned ScVal
    const isVerified = simulated.result.retval.b();
    console.log(`Verification status for ${userAddress}:`, isVerified);
    return isVerified;
  } catch (error) {
    console.error("Error interacting with contract:", error);
  }
}

/**
 * Submit a transaction to add a new KYC record (Admin Only)
 */
async function addKycRecord(adminSecret, userAddress, kycHashHex) {
  try {
    const adminKeypair = Keypair.fromSecret(adminSecret);
    
    // In a real application, you'd fetch the true sequence number from a Horizon/RPC node.
    // We'll mock the account object for the builder, and `prepareTransaction` will handle the rest.
    const account = new Account(adminKeypair.publicKey(), "0");

    // Convert the 32-byte hex hash into a Soroban ScVal bytes object
    const hashBuffer = Buffer.from(kycHashHex, 'hex');
    const kycHashScVal = xdr.ScVal.scvBytes(hashBuffer);

    let tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(
        "add_kyc",
        new Address(adminKeypair.publicKey()).toScVal(),
        new Address(userAddress).toScVal(),
        kycHashScVal
      ))
      .setTimeout(30)
      .build();

    // Automatically simulates, sets correct footprints, and calculates resource fees
    console.log("Preparing transaction resources...");
    tx = await server.prepareTransaction(tx);
    
    // Sign and submit to the network
    tx.sign(adminKeypair);
    console.log("Submitting transaction to the network...");
    return await server.sendTransaction(tx);
  } catch (error) {
    console.error("Error adding KYC record:", error);
  }
}

export { checkUserVerification, addKycRecord };