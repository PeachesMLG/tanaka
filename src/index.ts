import { Client, GatewayIntentBits } from 'discord.js';
import websocket from "./websocket";
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    websocket();
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('Error logging in:', error);
});