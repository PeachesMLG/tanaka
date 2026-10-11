import { Client, Message, PartialMessage } from 'discord.js';
import { getUserByMessageReference } from './utils/messageUtils';
import { TimedList } from './utils/timedList';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel } from './utils/getChannel';
import { createTimer } from './timers';

export const PHOENIX_BOT_ID = '496044007022133301';

const DAILY_COOLDOWN_MS = 1000 * 60 * 60 * 24;
const DROP_COOLDOWN_MS = 1000 * 60 * 10;

const handledDailyMessages = new TimedList<string>();
const handledDropMessages = new TimedList<string>();

const dropPattern = /^<@!?(\d+)>\s+You are dropping cards:/;

export const handlePhoenixMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (
    message.author?.id !== PHOENIX_BOT_ID ||
    Date.now() - message.createdTimestamp > 1000 * 60 * 2.5
  )
    return;

  if (message.components.length > 0) {
    await handleDaily(message, client);
  } else if (message.content) {
    await handleDrop(message, client);
  }
};

type RawComponent = { content?: string; components?: RawComponent[] };

const getComponentText = (components: RawComponent[]): string =>
  components
    .map((component) =>
      [component.content ?? '', getComponentText(component.components ?? [])]
        .filter((text) => text)
        .join('\n'),
    )
    .filter((text) => text)
    .join('\n');

const handleDaily = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  const text = getComponentText(
    message.components.map((component) => component.toJSON() as RawComponent),
  );
  if (
    !text.includes('Daily Reward') ||
    !text.includes('You claimed your daily reward')
  )
    return;

  if (handledDailyMessages.getItems().includes(message.id)) return;
  handledDailyMessages.add(message.id);

  const user = await getUserByMessageReference(
    message.reference,
    message.interactionMetadata,
    message.channel,
  );
  if (!user) return;

  await scheduleReminder(
    message,
    client,
    user,
    new Date(Date.now() + DAILY_COOLDOWN_MS),
    SettingsTypes.PHOENIX_DAILY_TIMERS,
    'Phoenix Daily',
    'Automatically triggered by Phoenix daily\n Turn this off in the /user settings command',
  );
};

const handleDrop = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  const match = message.content?.match(dropPattern);
  if (!match) return;

  if (handledDropMessages.getItems().includes(message.id)) return;
  handledDropMessages.add(message.id);

  await scheduleReminder(
    message,
    client,
    match[1],
    new Date(Date.now() + DROP_COOLDOWN_MS),
    SettingsTypes.PHOENIX_DROP_TIMERS,
    'Phoenix Drop',
    'Automatically triggered by Phoenix drop\n Turn this off in the /user settings command',
  );
};

const scheduleReminder = async (
  message: Message | PartialMessage,
  client: Client,
  user: string,
  futureTime: Date,
  setting: SettingsTypes,
  reason: string,
  information: string,
) => {
  if (client.users.cache.get(user)?.bot) return;

  const defaultSetting =
    (await getSetting(
      message.guild?.id ?? '',
      SettingsTypes.ENABLE_AUTOMATIC_TIMERS_AS_DEFAULT,
    )) ?? 'true';

  const enabled = (await getSetting(user, setting)) ?? defaultSetting;
  if (enabled !== 'true') return;

  const channel = await getChannel(message.channelId, client);
  if (channel === null) return;

  await createTimer(
    channel,
    undefined,
    futureTime,
    user,
    reason,
    client,
    information,
  );
};
