const { initializeContract, getUnrewardedFiles, rewardFile } = require('./blockchain/contract');
const { logInfo } = require('./logs/logger');
const CONFIG = require("./utils/config");

const main = async () => {
    console.log("🚀 ~ CONFIG:", CONFIG)
    const { dlpContract, registrationContract } = await initializeContract();
    const files = await getUnrewardedFiles(Number(CONFIG.ENV.START_FILE_ID), Number(CONFIG.ENV.END_FILE_ID), registrationContract, dlpContract);
    const rewardingResults = await rewardFile(dlpContract, registrationContract, files.unrewardedFiles);
    logInfo(rewardingResults);
}

main();