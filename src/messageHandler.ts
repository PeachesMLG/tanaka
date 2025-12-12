import {
  ActionRow,
  ButtonComponent,
  Client,
  Message,
  PartialMessage,
} from 'discord.js';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { TimedList } from './utils/timedList';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel } from './utils/getChannel';
import { createTimer } from './timers';
import { getCardInfo } from './utils/cardUtils';
import { CardDetails } from './types/cardDetails';
import { isUserPremium } from './utils/userUtils';
import { LeaderboardType } from './types/leaderboardType';
import { incrementLeaderboard } from './database/leaderboardDatabase';

const handledCardSummonMessages = new TimedList();
const handledCardClaimMessages = new TimedList();
const handledClanWarSpells = new TimedList();
const handledTimerMessages = new TimedList();
const claimPattern =
  /^(.+?)\s+•\s+\*\*(.+?)\*\*\s+•\s+\*(.+?)\*\s+•\s+`v(\d+)`$/;
const claimedByPattern = /<@!?(\d+)>/;

const timers = [
  {
    title: 'Box Opened',
    cooldown: 2,
    timerMessage: '</open-boxes:1435883794254004256>',
    timerInformation:
      'Automatically triggered by Opening a box\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_BOX_TIMERS,
  },
  {
    title: 'Summer Cards',
    cooldown: 30,
    timerMessage: '</summer:1410782373427286109>',
    timerInformation:
      'Automatically triggered by Summer Spawn\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_SUMMER_TIMERS,
  },
  {
    title: 'Date Reward Claimed!',
    cooldown: 180,
    premiumCooldown: 90,
    timerMessage: '</date:1410808024070619217>',
    timerInformation:
      'Automatically triggered by Dates\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_DATE_TIMERS,
  },
  {
    title: 'Casting for Round',
    cooldown: 30,
    leaderboard: LeaderboardType.CLAN_SUMMON,
    timerMessage: '</clan-summon:1448360325807214703>',
    timerInformation:
      'Automatically triggered by Clan Summon\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_CLAN_SUMMONS,
  },
];

export const handleMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (message.author?.id !== '1242388858897956906') return;
  if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Summon') &&
    !message.embeds[0].title?.includes('Claimed')
  ) {
    await handleCardSummon(message, client);
  } else if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Claimed') &&
    message.embeds[0].image
  ) {
    await handleCardClaim(message, client);
  } else if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Casting for Round')
  ) {
    await handleChoosingSpell(message, client);
  }

  await handleTimers(message, client);
};

const handleTimers = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  for (const timer of timers) {
    if (
      message.embeds.length > 0 &&
      message.embeds[0].title?.includes(timer.title)
    ) {
      if (handledTimerMessages.getItems().includes(message.id)) return;
      handledTimerMessages.add(message.id);

      const user = await getUserByMessageReference(
        message.reference,
        message.interactionMetadata,
        message.channel,
      );

      if (!user) return;

      if (timer.leaderboard) {
        await incrementLeaderboard(user, timer.leaderboard);
      }

      const defaultSetting =
        (await getSetting(
          message.guild?.id ?? '',
          SettingsTypes.ENABLE_AUTOMATIC_TIMERS_AS_DEFAULT,
        )) ?? 'true';

      const enabled = (await getSetting(user, timer.setting)) ?? defaultSetting;

      if (enabled !== 'true') return;

      const channel = await getChannel(message.channelId, client);
      if (channel === null) return;

      let cooldown = timer.cooldown;

      if (timer.premiumCooldown && (await isUserPremium(user))) {
        cooldown = timer.premiumCooldown;
      }

      let futureTime = new Date(Date.now() + 1000 * 60 * cooldown);
      const amount =
        user === '1242464569302057084' &&
        timer.leaderboard === LeaderboardType.CLAN_SUMMON
          ? 10
          : 1;
      for (let i = 0; i < amount; i++) {
        await createTimer(
          channel,
          undefined,
          futureTime,
          user,
          timer.timerMessage,
          client,
          timer.timerInformation,
        );
      }
      return;
    }
  }
};

const handleCardSummon = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledCardSummonMessages.getItems().includes(message.id)) return;
  if (
    !message.embeds[0].image ||
    !message.embeds[0].image.url.includes('/packs/')
  )
    return;
  handledCardSummonMessages.add(message.id);

  const cardUUIDs =
    message.embeds[0].image?.url
      .split('/packs/')[1]
      .split('/')
      .filter((uuid) => uuid) ?? [];

  if (cardUUIDs) {
    handledCardSummonMessages.add(message.id);
  }

  const cardInfo = (await Promise.all(cardUUIDs.map(getCardInfo))).filter(
    (cardInfo) => cardInfo,
  ) as CardDetails[];

  if (!cardInfo) {
    return;
  }

  await cardSpawnHandler(
    {
      ChannelId: message.channelId ?? '',
      ServerId: message.guildId ?? '',
      SummonedBy: await getUserByMessageReference(
        message.reference,
        message.interactionMetadata,
        message.channel,
      ),
      Cards: cardInfo,
    },
    client,
    message,
  );
};

const handleCardClaim = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledCardClaimMessages.getItems().includes(message.id)) return;
  if (!message.embeds[0].description) return;

  const cardUUID = message.embeds[0]
    .image!.url.split('/cards/')[1]
    .split('.')[0];
  const cardDetails = await getCardInfo(cardUUID);
  if (!cardDetails) return;

  handledCardClaimMessages.add(message.id);

  const cardInfo = message.embeds[0].description
    ?.split('\n')
    .map(GetCardClaimInfo)
    .filter((cardInfo) => cardInfo);

  const userIds = message.embeds[0].description
    ?.split('\n')
    .map(GetClaimedBy)
    .filter((cardInfo) => cardInfo) as string[];

  const userId = userIds[0] ?? 'N/A';
  const version = cardInfo[0]?.Version ?? 'N/A';

  await cardClaimHandler(
    {
      ServerId: message.guildId?.toString() ?? '',
      UserID: userId,
      CardItem: {
        Version: version,
        Details: cardDetails,
      },
      DateTime: new Date(),
    },
    client,
  );
};

const handleChoosingSpell = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (message.channelId !== '1293966820885401641') return;
  if (handledClanWarSpells.getItems().includes(message.id)) return;

  const spellsAvailable: string[] = [];
  for (const row of message.components) {
    const actionRow = row as ActionRow<ButtonComponent>;
    spellsAvailable.push(
      ...actionRow.components.map((component) =>
        component.label === null ? '' : component.label,
      ),
    );
  }

  const spellsAvailableLower = spellsAvailable.map((s) => s.toLowerCase());

  const spellPriority = [
    {
      spellName: 'Phoenix Revival',
      target: SettingsTypes.CLAN_WAR_HEAL_TARGET,
      priority: 1,
    },
    {
      spellName: 'Divine Aegis',
      target: SettingsTypes.CLAN_WAR_SHIELD_TARGET,
      priority: 2,
    },
    {
      spellName: 'Chaos Orb',
      target: SettingsTypes.CLAN_WAR_ATTACK_TARGET,
      priority: 3,
    },
    {
      spellName: 'Life Surge',
      target: SettingsTypes.CLAN_WAR_HEAL_TARGET,
      priority: 4,
    },
    {
      spellName: 'Mirror Force',
      target: SettingsTypes.CLAN_WAR_SHIELD_TARGET,
      priority: 5,
    },
    {
      spellName: 'Inferno Blast',
      target: SettingsTypes.CLAN_WAR_ATTACK_TARGET,
      priority: 6,
    },
    {
      spellName: 'Regeneration',
      target: SettingsTypes.CLAN_WAR_HEAL_TARGET,
      priority: 7,
    },
    {
      spellName: 'Mystic Ward',
      target: SettingsTypes.CLAN_WAR_SHIELD_TARGET,
      priority: 8,
    },
    {
      spellName: 'Lightning Strike',
      target: SettingsTypes.CLAN_WAR_ATTACK_TARGET,
      priority: 9,
    },
    {
      spellName: 'Healing Light',
      target: SettingsTypes.CLAN_WAR_HEAL_TARGET,
      priority: 10,
    },
    {
      spellName: 'Stone Shield',
      target: SettingsTypes.CLAN_WAR_SHIELD_TARGET,
      priority: 11,
    },
    {
      spellName: 'Frost Shard',
      target: SettingsTypes.CLAN_WAR_ATTACK_TARGET,
      priority: 12,
    },
  ];

  const validSpells = spellPriority.filter((spell) =>
    spellsAvailableLower.includes(spell.spellName.toLowerCase()),
  );

  validSpells.sort((a, b) => a.priority - b.priority);

  handledClanWarSpells.add(message.id);

  const chosenSpell = validSpells[0];
  const targetClan =
    (await getSetting(message.guild?.id ?? '', chosenSpell.target)) ?? 'N/A';

  await message.reply({
    content: `Suggested Spell: ${chosenSpell} Suggested Target: ${targetClan}`,
  });
};

const GetCardClaimInfo = (description: string) => {
  const match = description.match(claimPattern);
  if (match) {
    const [, emote, name, series, version] = match;
    return {
      Version: version,
    };
  }
  return undefined;
};

const GetClaimedBy = (description: string) => {
  const match = description.match(claimedByPattern);
  if (match) {
    const [, userId] = match;
    return userId;
  }
  return undefined;
};
