import uniswapV2Dexes from './index.js';
import { onPairCreated } from '../utils/utils.js';

for (const dex of uniswapV2Dexes) {
    dex['factory'].on('PairCreated', async (token0Address, token1Address, addressPair) => {
        await onPairCreated(
            dex['account'],
            token0Address,
            token1Address,
            addressPair,
            dex['chainName'],
            dex['dexName'],
            dex['knownTokens']
        );
    });
    console.log(`initiated ${dex['dexName']}`);
}
