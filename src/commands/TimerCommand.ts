import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { createTimer } from '../timers';

export class TimerCommand implements Command {
  command: SharedSlashCommand;
  client: Client;

  constructor(client: Client) {
    this.client = client;
    this.command = new SlashCommandBuilder()
      .setName('timer')
      .setDescription('Create a Timer')
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('The reason for the timer')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('time')
          .setDescription('When you want the timer to go off')
          .setRequired(false),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const reason = interaction.options.getString('reason');
    const time = interaction.options.getString('time') ?? '2m';
    let data = this.splitNumberAndString(time);
    if (!data || !data[0]) return;
    let milliseconds = this.convertToMilliseconds(
      data[0] as number,
      (data[1] as string).toLowerCase(),
    );

    if (milliseconds <= 0) return;
    if (milliseconds >= 2147483647) {
      await interaction.reply({
        embeds: [
          getEmbedMessage(channel, 'Timer', `Timer exceeded maximum duration`),
        ],
      });
      return;
    }

    let futureTime = new Date(Date.now() + milliseconds);
    let unixTimestamp = Math.floor(futureTime.getTime() / 1000);
    await createTimer(
      channel,
      interaction,
      unixTimestamp,
      interaction.user.id,
      reason ?? '',
      this.client,
    );
  }

  splitNumberAndString(time: string) {
    const regex = /(\d+)([a-zA-Z]+)/;
    const matches = time.match(regex);

    if (matches) {
      let number = parseInt(matches[1], 10);
      let stringPart = matches[2];
      return [isNaN(number) ? 2 : number, stringPart, 1];
    } else {
      let number = parseInt(time);
      return [isNaN(number) ? 2 : number, 'm', 0];
    }
  }

  convertToMilliseconds(number: number, type: string) {
    const millisecondsPerSecond = 1000;
    const millisecondsPerMinute = 60 * millisecondsPerSecond;
    const millisecondsPerHour = 60 * millisecondsPerMinute;
    const millisecondsPerDay = 24 * millisecondsPerHour;

    if (type === 's' || type == 'sec' || type == 'secs') {
      return number * millisecondsPerSecond;
    } else if (type === 'm' || type == 'min' || type == 'mins') {
      return number * millisecondsPerMinute;
    } else if (type === 'h' || type == 'hour' || type == 'hours') {
      return number * millisecondsPerHour;
    } else if (type === 'd' || type == 'day' || type == 'days') {
      return number * millisecondsPerDay;
    } else {
      return 0;
    }
  }
}
