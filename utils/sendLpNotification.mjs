import { createRequire } from 'module'; // Bring in the ability to create the 'require' method in es6 modules
const require = createRequire(import.meta.url); // construct the require method
const path = require('path');
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const client = require('twilio');

import { MessageEmbed, WebhookClient } from 'discord.js';
import connections from '../connections.mjs';
const { BSC, ETH, FTM, AVAX, AURORA, FUSE, METIS, OPTIMISM, ARBITRUM } = connections;
const dexscreenerUrl = 'https://dexscreener.com';

const getHookInfo = (chain, dex) => {
    let hook = {};

    switch (chain) {
        case 'BSC': {
            hook.img = BSC.img;
            hook.greenUrl = BSC.webhooks.newPair;
            hook.explorerUrl = `${BSC.explorer.url}/token/`;
            hook.dexscreenerUrl = `${dexscreenerUrl}/bsc`;
            if (dex === 'pancakeswap') {
                hook.dexUrl = BSC.dexes.pancakeswap.url;
            } else {
                hook.dexUrl = '';
            }
            break;
        }

        default:
            break;
    }
    return hook;
};

const notificationWorthy = (liquidityUSD, chain) => {
    // do research here to determine
    let worthy = false;
    switch (chain) {
        case 'EVMOS': {
            if (liquidityUSD >= 1000) {
                worthy = true;
            }
            break;
        }
        default:
            break;
    }
    return worthy;
};

const sendLPNotification = async (pair) => {
    const hook = getHookInfo(pair.chain, pair.dex);

    const webhookClient = new WebhookClient({
        url: hook.greenUrl,
    });

    let color = '';
    if (pair.liquidityUSD >= 50000) {
        color = '#00ff00';
    } else if (pair.liquidityUSD >= 10000) {
        color = '#ffff00';
    } else {
        color = '#ff0000';
    }

    let symbolOldToken = '';
    let symbolNewToken = '';
    let nameNewToken = '';
    let addressNewToken = '';
    if (pair.newToken === 'token0') {
        symbolOldToken = pair.token1.symbol;
        symbolNewToken = pair.token0.symbol;
        nameNewToken = pair.token0.name;
        addressNewToken = pair.token0.address;
    } else if (pair.newToken === 'token1') {
        symbolOldToken = pair.token0.symbol;
        symbolNewToken = pair.token1.symbol;
        nameNewToken = pair.token1.name;
        addressNewToken = pair.token1.address;
    }

    const embed = new MessageEmbed()
        .setColor(color)
        .setTitle(`${symbolOldToken}/${symbolNewToken}`)
        .setURL(hook.dexUrl)
        .setAuthor({ name: `${pair.chain}-BOT`, iconURL: hook.img, url: 'https://discord.js.org' })
        .addFields(
            {
                name: 'Pair information',
                value: `${symbolOldToken}/${symbolNewToken}\n${pair.address}\n${hook.explorerUrl}${pair.address}\n\n${hook.dexscreenerUrl}/${pair.address}`,
            },
            {
                name: 'Token information',
                value: `${nameNewToken} (${symbolNewToken})\n${addressNewToken}\n${hook.explorerUrl}${addressNewToken}`,
            },
            {
                name: 'Liquidity information',
                value: `liquidity (${symbolOldToken}, USD): ${pair.liquidity.toFixed(2)}, $${pair.liquidityUSD.toFixed(
                    2
                )}`,
            }
        )
        .setTimestamp();

    webhookClient.send({
        username: 'liquidity pair bot',
        avatarURL: 'https://i.imgur.com/AfFp7pu.png',
        embeds: [embed],
    });

    if (notificationWorthy(pair.liquidityUSD, pair.chain)) {
        let webhookNotificationClient = new WebhookClient({ url: process.env.discord_newPairHookUrl });
        webhookNotificationClient.send({
            username: 'liquidity pair bot',
            avatarURL: 'https://i.imgur.com/AfFp7pu.png',
            embeds: [embed],
        });

        // phone call here lol. wake the fuck up
        const cli = client(process.env.twilio_accountSid, process.env.twilio_authToken);
        await cli.calls.create({
            url: 'http://demo.twilio.com/docs/voice.xml',
            from: process.env.twilio_fromNumber,
            to: process.env.twilio_toNumber,
        });
    }
};

export default sendLPNotification;
