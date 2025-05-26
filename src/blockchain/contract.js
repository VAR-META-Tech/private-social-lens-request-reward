const ethers = require("ethers");
const CONFIG = require("../utils/config");
const DLP_CONTRACT_ABI = require("../assets/dpl-ABI.json");
const REGISTRATION_CONTRACT_ABI = require("../assets/registry-ABI.json");

const initializeContract = async () => {
  const provider = new ethers.JsonRpcProvider(CONFIG.ENV.RPC_URL);
  const signer = new ethers.Wallet(
    CONFIG.ENV.ADMIN_WALLET_PRIVATE_KEY,
    provider
  );
  const dlpContract = new ethers.Contract(
    CONFIG.ENV.DLP_CONTRACT_ADDRESS,
    DLP_CONTRACT_ABI.abi,
    signer
  );
  const registrationContract = new ethers.Contract(
    CONFIG.ENV.REGISTRATION_CONTRACT_ADDRESS,
    REGISTRATION_CONTRACT_ABI.abi,
    signer
  );

  return { dlpContract, registrationContract };
};

const getUnrewardedFiles = async (
  startId,
  endId,
  registrationContract,
  dlpContract
) => {
  try {
    const unrewardedFiles = [];
    const rewardedFiles = [];
    const biggestFileId = Number(await registrationContract.filesCount());
    console.log("🚀 ~ biggestFileId:", biggestFileId);
    const stopId = Math.min(endId, biggestFileId);
    // Process files in batches of 50 to avoid rate limiting
    const BATCH_SIZE = Number(CONFIG.ENV.BATCH_SIZE);
    console.log("🚀 ~ BATCH_SIZE:", BATCH_SIZE);
    const DELAY_BETWEEN_BATCHES = Number(CONFIG.ENV.DELAY_BETWEEN_BATCHES);
    console.log("🚀 ~ DELAY_BETWEEN_BATCHES:", DELAY_BETWEEN_BATCHES);

    for (let i = startId; i <= stopId; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, stopId);
      console.log(`Files Processing batch from ${i} to ${batchEnd}`);
      // Create promises for this batch
      const batchPromises = Array.from(
        { length: batchEnd - i + 1 },
        (_, index) => dlpContract.files(i + index)
      );
      // Execute batch
      const batchResults = await Promise.all(batchPromises);
      // Process batch results
      batchResults.forEach((file, index) => {
        if (file) {
          const proofIndex = file[2];
          if (proofIndex > 0n) {
            rewardedFiles.push(file);
          } else {
            unrewardedFiles.push(file);
          }
        }
      });
      // Add delay between batches if not the last batch
      if (batchEnd < stopId) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES)
        );
      }
    }

    console.log("🚀 ~ unrewardedFiles:", unrewardedFiles);

    return { unrewardedFiles, rewardedFiles };
  } catch (error) {
    console.error("Error in getUnrewardedFiles:", error);
    throw error;
  }
};

const rewardFile = async (dlpContract, registrationContract, fileIds) => {
  console.log("================🚀 START REWARDING================");
  const PROOF_INDEX = Number(CONFIG.ENV.PROOF_INDEX);
  const proofInstruction = await dlpContract.proofInstruction();
  const rewardingResults = [];

  for (let i = 0; i < fileIds.length; i++) {
    try {
      const fileId = Number(fileIds[i][0]);
      // Check file eligibility before attempting to reward
      const fileInfo = await dlpContract.files(fileId);
      const fileProof = await registrationContract.fileProofs(fileId, 1);
      const intruction = fileProof[1][4];

      if (!fileInfo) {
        console.log(`File ${fileId} not found, skipping...`);
        continue;
      }

      const proofIndex = fileInfo[2];
      if (proofIndex > 0n) {
        console.log(
          `File ${fileId} already has proof index ${proofIndex}, skipping...`
        );
        rewardingResults.push({
          fileId,
          message: `File ${fileId} already has proof index ${proofIndex}, skipping...`,
          status: "SKIPPED",
          txHash: "",
        });
        continue;
      }

      if (!intruction) {
        console.log(`File ${fileId} has no instruction, skipping...`);
        rewardingResults.push({
          fileId,
          message: `File ${fileId} has no instruction, skipping...`,
          status: "SKIPPED",
          txHash: "",
        });
        continue;
      }

      if (intruction !== proofInstruction) {
        console.log(`File ${fileId} has wrong instruction, skipping...`);
        rewardingResults.push({
          fileId,
          message: `File ${fileId} has wrong instruction, skipping...`,
          status: "SKIPPED",
          txHash: "",
        });
        continue;
      }

      console.log(`Requesting reward for file ${fileId}`);
      const tx = await dlpContract.requestReward(fileId, PROOF_INDEX);
      console.log(`Transaction sent for file ${fileId}:`, tx.hash);
      await tx.wait(); // Wait for transaction to be mined
      console.log(`Transaction confirmed for file ${fileId}`);

      rewardingResults.push({
        fileId,
        message: `Transaction confirmed for file ${fileId}`,
        status: "SUCCESS",
        txHash: tx.hash.toString(),
      });
      // Add a small delay between transactions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing file ${fileIds[i][0]}:`, error.message);
      rewardingResults.push({
        fileId: fileIds[i][0],
        message: error.message,
        status: "FAILED",
        txHash: "",
      });
      // Continue with next file even if one fails
      continue;
    }
  }
  console.log("================DONE REWARDING================");

  return rewardingResults;
};

module.exports = {
  initializeContract,
  getUnrewardedFiles,
  rewardFile,
};
