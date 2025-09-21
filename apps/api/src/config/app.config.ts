export default {
  USE_BLOCKCHAIN_CONTRACTS: (process.env.USE_BLOCKCHAIN_CONTRACTS || 'false') === 'true',
  USE_BLOCKCHAIN_LEDGER: (process.env.USE_BLOCKCHAIN_LEDGER || 'true') === 'true',
  USE_ERC20: (process.env.USE_ERC20 || 'true') === 'true',
  USE_BLOCKCHAIN_PROD: (process.env.USE_BLOCKCHAIN_PROD || 'false') === 'true',
};
