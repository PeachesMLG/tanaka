import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { CardClaim, CardDespawn, CardSpawn } from './types/websocketMessage';
import { cardDespawnHandler } from './handlers/cardDespawnHandler';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { Client } from 'discord.js';

const webSocket = (client: Client) => {
  console.log('Connecting to Websocket...');
  const websocketUrl = 'https://api.mazoku.cc/api/websocket';
  const socket = new WebSocket(websocketUrl);

  socket.addEventListener('open', () => {
    console.log('WebSocket connection established.');
  });

  socket.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      const messageType = data.messageType;
      switch (messageType) {
        case 'CardSpawn':
          await cardSpawnHandler(data.data as CardSpawn, client);
          break;
        case 'CardDespawn':
          await cardDespawnHandler(data.data as CardDespawn, client);
          break;
        case 'CardClaim':
          await cardClaimHandler(data.data as CardClaim, client);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', event.data, error);
    }
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);

    if (
      socket.readyState === WebSocket.CLOSED ||
      socket.readyState === WebSocket.CLOSING
    ) {
      console.log('Connection is closed. Retrying in 5 seconds...');
      setTimeout(webSocket, 5000);
    }
  });

  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event);
    console.log('Connection is closed. Retrying in 5 seconds...');
    setTimeout(webSocket, 5000);
  });
};

export default webSocket;
