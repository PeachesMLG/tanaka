import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { CardClaim, CardDespawn, CardSpawn } from './types/websocketMessage';
import { cardDespawnHandler } from './handlers/cardDespawnHandler';
import { cardClaimHandler } from './handlers/cardClaimHandler';

const webSocket = () => {
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
          await cardSpawnHandler(data.data as CardSpawn);
          break;
        case 'CardDespawn':
          await cardDespawnHandler(data.data as CardDespawn);
          break;
        case 'CardClaim':
          await cardClaimHandler(data.data as CardClaim);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', event.data, error);
    }
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event);
    webSocket();
  });
};

export default webSocket;
