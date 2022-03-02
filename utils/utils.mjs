import connections from '../connections.mjs';
import ethers from 'ethers';
import 'dotenv/config';
import fetch from 'node-fetch';
import sendLPNotification from './sendLpNotification.mjs';

const uniV2Factory = ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'];
const uniV3Factory = ['event PoolCreated(address token0, address token1, uint24 fee, int24 tickSpacing, address pool)'];
const uniV2Pair = [
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
];

const URL = process.env.environment === 'PROD' ? process.env.prodURL : process.env.devURL;

const onPairCreated = async (account, token0Address, token1Address, addressPair, chain, dex, knownTokens) => {
    let promises = [getTokenMetadata(token0Address, account), getTokenMetadata(token1Address, account)];
    let [token0, token1] = await Promise.all(promises);

    const { liq0, liq1 } = await getPairLiquidity(token0.decimals, token1.decimals, addressPair, account);

    token0.liq = liq0;
    token1.liq = liq1;

    try {
        let pairInfo = getPairInfo(token0, token1, addressPair, chain, dex, knownTokens);
        displayPair(pairInfo);

        const { liquidity, liquidityUSD, newToken } = pairInfo;
        addPair(chain, dex, addressPair, token0, token1, liquidity, liquidityUSD, newToken);
    } catch (e) {
        console.log(e);
    }
};

const addPair = async (chain, dex, pairAddress, token0, token1, liquidity, liquidityUSD, newToken) => {
    const requestBody = {
        chain,
        dex,
        address: pairAddress,
        token0,
        token1,
        liquidity,
        liquidityUSD,
        newToken,
    };
    console.log('in add pair');

    sendLPNotification(requestBody);
};

const getTokenMetadata = async (tokenAddress, account) => {
    let token = {
        address: tokenAddress,
    };

    const tokenInfoABI = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() public view returns (uint8)',
    ];

    let success = false;
    let count = 0;

    while (!success) {
        try {
            count++;
            let contract = new ethers.Contract(token.address, tokenInfoABI, account);
            let promises = [contract.name(), contract.symbol(), contract.decimals()];
            [token.name, token.symbol, token.decimals] = await Promise.all(promises);
            token.deployerAddress = contract.address;
            success = true;
        } catch (e) {
            // console.log(e);
            console.log(`sleeping at ${token.address}`);
            await sleep(3000 * (count + 1));
            if (count > 10) break;
        }
    }

    return token;
};

const getPairLiquidity = async (token0Decimals, token1Decimals, addressPair, account) => {
    const pairContract = new ethers.Contract(
        addressPair,
        [
            'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        ],
        account
    );

    let success = false;
    let count = 0;
    let reserves;

    while (!success) {
        try {
            count++;
            reserves = await pairContract.getReserves();
            success = true;
        } catch (e) {
            await sleep(1000);
            if (count > 15) break;
        }
    }

    let liq0 = 0;
    let liq1 = 0;

    try {
        liq0 = ethers.utils.formatUnits(reserves['reserve0'], token0Decimals);
        liq1 = ethers.utils.formatUnits(reserves['reserve1'], token1Decimals);
    } catch (e) {
        console.log(`could not find liquidity for tokens in the pair with address ${addressPair}`);
        console.log(e);
    }

    return { liq0, liq1 };
};

const getPairInfo = (token0, token1, addressPair, chain, dex, knownTokens) => {
    let pairInfo = {
        liquidity: 0,
        liquidityUSD: 0,
        addressNewToken: '',
        symbolNewToken: '',
        symbolOldToken: '',
        nameNewToken: '',
        address: addressPair,
        chain: chain,
        dex: dex,
        newToken: '',
    };

    let knownAddresses = Object.values(knownTokens).map((token) => token.address.toLowerCase());

    try {
        if (knownAddresses.includes(token0.address.toLowerCase())) {
            pairInfo.liquidity = parseInt(token0.liq);
            pairInfo.liquidityUSD = parseInt(pairInfo.liquidity) * knownTokens[token0.symbol]['inUSD'];
            pairInfo.symbolOldToken = token0.symbol;
            pairInfo.addressNewToken = token1.address;
            pairInfo.symbolNewToken = token1.symbol;
            pairInfo.nameNewToken = token1.name;
            pairInfo.newToken = 'token1';
        } else if (knownAddresses.includes(token1.address.toLowerCase())) {
            pairInfo.liquidity = parseInt(token1.liq);
            pairInfo.liquidityUSD = parseInt(pairInfo.liquidity) * knownTokens[token1.symbol]['inUSD'];
            pairInfo.symbolOldToken = token1.symbol;
            pairInfo.addressNewToken = token0.address;
            pairInfo.symbolNewToken = token0.symbol;
            pairInfo.nameNewToken = token0.name;
            pairInfo.newToken = 'token0';
        } else {
            // none of the addresses in the pair are known... liq is basically 0?
            // do nothing
        }
    } catch (e) {
        console.log(`token0: ${token0.symbol} ${token0.address}`);
        console.log(`token1: ${token1.symbol} ${token1.address}`);
        console.error(e);
    }

    return pairInfo;
};

const displayPair = (pairInfo) => {
    const FgRed = '\x1b[31m';
    const FgGreen = '\x1b[32m';
    const FgYellow = '\x1b[33m';

    let color = '';
    if (pairInfo.liquidityUSD >= 10000.0) {
        color = FgGreen;
    } else if (pairInfo.liquidityUSD >= 5000.0) {
        color = FgYellow;
    } else {
        color = FgRed;
    }

    console.log(color, `${color}`);
    console.log(
        `${pairInfo.symbolOldToken}/${pairInfo.symbolNewToken}\n${pairInfo.nameNewToken}\nliq (${
            pairInfo.symbolOldToken
        }, USD): ${pairInfo.liquidity.toFixed(2)}, $${pairInfo.liquidityUSD.toFixed(2)}\n${
            pairInfo.symbolNewToken
        } address: ${pairInfo.addressNewToken}\npair: ${pairInfo.address}\n${pairInfo.dex}\n`
    );
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const getAccount = (connectionType, chain) => {
    let provider;
    if (connectionType === 'ws') {
        provider = new ethers.providers.WebSocketProvider(connections[chain][connectionType]);
    } else if (connectionType === 'http') {
        provider = new ethers.providers.JsonRpcProvider(connections[chain][connectionType]);
    }
    const wallet = ethers.Wallet.fromMnemonic(process.env.mnemonic);
    return wallet.connect(provider);
};

export {
    getTokenMetadata,
    getPairLiquidity,
    displayPair,
    onPairCreated,
    uniV2Factory,
    uniV3Factory,
    uniV2Pair,
    getAccount,
    sleep,
};
