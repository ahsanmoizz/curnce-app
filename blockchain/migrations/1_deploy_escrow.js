const EscrowManager = artifacts.require("EscrowManager");
const MockERC20 = artifacts.require("MockERC20");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(EscrowManager, accounts[0], accounts[1]);
  const escrow = await EscrowManager.deployed();
  console.log("Escrow deployed at:", escrow.address);

  await deployer.deploy(MockERC20, "Mock USD", "mUSD", web3.utils.toWei('1000000'));
  const token = await MockERC20.deployed();
  console.log("MockERC20 at:", token.address);

  // Persist for API
  const fs = require('fs');
  const path = require('path');
  const outPath = path.resolve(__dirname, '../../apps/api/config/blockchain.addresses.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    ESCROW_ADDRESS: escrow.address,
    MOCK_ERC20: token.address,
    deployedAt: new Date().toISOString()
  }, null, 2));
  console.log("Saved addresses to apps/api/config/blockchain.addresses.json");
};
