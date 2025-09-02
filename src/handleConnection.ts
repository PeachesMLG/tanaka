import { Client } from 'discord.js';

export const handleConnection = (client: Client) => {
  client.on('reconnecting', (message) => {
    console.log(`User Reconnecting`);
  });

  client.on('resume', (message) => {
    console.log(`Connected ${client.user?.tag}`);
  });

  client.on('disconnect', (message) => {
    console.log(`User Disconnected`);
    process.exit(1);
  });

  client.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  client.on('shardReconnecting', (message) => {
    console.log(`Shard Reconnecting`);
  });

  client.on('shardResume', (message) => {
    console.log(`Shard Resumed`);
  });

  client.on('shardDisconnect', (message) => {
    console.log(`Shard Disconnected`);
    process.exit(1);
  });

  client.on('shardError', (err) => {
    console.error(err);
    process.exit(1);
  });
};
