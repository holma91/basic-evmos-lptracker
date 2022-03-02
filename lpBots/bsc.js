import ethers from 'ethers';
import { uniV2Factory, getAccount } from '../utils/utils.js';

const addresses = {
    pancakeSwapFactory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
};

const knownTokens = {
    WBNB: { address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', inUSD: 410 },
    BUSD: { address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', inUSD: 1 },
};

const account = getAccount('http', 'BSC');

const pancakeswap = {
    factory: new ethers.Contract(addresses.pancakeSwapFactory, uniV2Factory, account),
    account: account,
    knownTokens: knownTokens,
    dexName: 'pancakeswap',
    chainName: 'BSC',
};

export { pancakeswap };
