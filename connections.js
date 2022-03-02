import 'dotenv/config';

const connections = {
    BSC: {
        http: process.env.bsc_http,
        ws: process.env.bsc_ws,
        img: 'https://s2.coinmarketcap.com/static/img/coins/200x200/1839.png',
        explorer: {
            url: 'https://bscscan.com',
            apikey: process.env.bscscan_apikey,
        },
        webhooks: {
            newPair: process.env.bsc_newpairhook,
        },
        dexes: {
            pancakeswap: {
                url: 'https://pancakeswap.finance/swap',
            },
        },
    },
    EVMOS: {
        http: process.env.evmos_http,
        ws: process.env.evmos_ws,
        img: 'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
        explorer: {
            // url: 'https://etherscan.io',
            // apikey: process.env.etherscan_apikey,
        },
        webhooks: {
            newPair: process.env.evmos_newpairhook,
        },
        dexes: {
            diffusion: {
                // url: 'https://app.uniswap.org/#/swap',
            },
        },
    },
};
export default connections;
