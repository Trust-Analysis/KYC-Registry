import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { checkUserVerification, addKycRecord } from './client.js';

const app = express();
app.use(express.json());

// MOCK DATABASE: In a production environment, this should be a secure 
// database like PostgreSQL or MongoDB to store PII safely off-chain.
// NEVER store this raw data on the public Stellar ledger!
const offChainSecureDb = new Map();

const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.error("❌ ERROR: Missing ADMIN_SECRET in environment variables");
  process.exit(1);
}

/**
 * POST /api/kyc/submit
 * Receives user PII, stores it off-chain, and commits the privacy-preserving hash to Stellar.
 */
app.post('/api/kyc/submit', async (req, res) => {
  const { userAddress, fullName, documentId } = req.body;

  if (!userAddress || !fullName || !documentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create a privacy-preserving SHA-256 hash of the PII
    // This results in a 64-character hex string (32 bytes), perfect for our Soroban contract
    const dataString = `${userAddress}:${fullName}:${documentId}`;
    const kycHashHex = crypto.createHash('sha256').update(dataString).digest('hex');

    // 2. Store the raw PII securely off-chain
    offChainSecureDb.set(userAddress, {
      fullName,
      documentId,
      kycHash: kycHashHex,
      verifiedAt: new Date().toISOString()
    });

    console.log(`Stored PII off-chain for ${userAddress}`);

    // 3. Submit only the hash to the Stellar Soroban Smart Contract
    const txResult = await addKycRecord(ADMIN_SECRET, userAddress, kycHashHex);

    res.status(200).json({
      message: 'KYC data processed and recorded on-chain successfully',
      kycHash: kycHashHex,
      txHash: txResult?.hash || 'Simulation/Mock transaction'
    });
  } catch (error) {
    console.error('Failed to process KYC:', error);
    res.status(500).json({ error: 'Internal server error processing KYC' });
  }
});

/**
 * GET /api/kyc/status/:address
 * Checks if a user is verified by querying the Stellar smart contract directly.
 */
app.get('/api/kyc/status/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const isVerified = await checkUserVerification(address);

    res.status(200).json({
      userAddress: address,
      isVerifiedOnChain: isVerified,
    });
  } catch (error) {
    console.error('Failed to fetch status:', error);
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 KYC Backend server running on port ${PORT}`));