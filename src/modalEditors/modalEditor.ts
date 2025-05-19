import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { TimedMap } from '../utils/timedMap';

export type ModalEditorValues<T> = {
  object: T;
  interaction: ChatInputCommandInteraction;
};

export class ModalEditor<T extends Record<string, string | number>> {
  private readonly storedValues = new TimedMap<ModalEditorValues<T>>();

  constructor(private readonly title: string) {}

  getModal(guid: string, values: ModalEditorValues<T>): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(this.getId(guid))
      .setTitle(this.title);

    const rows: ActionRowBuilder<TextInputBuilder>[] = [];

    for (const [key, value] of Object.entries(values.object)) {
      const label = this.toLabel(key);
      if (!label) continue;
      rows.push(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(key)
            .setLabel(label)
            .setStyle(TextInputStyle.Short)
            .setValue(String(value).slice(0, 4000))
            .setRequired(true),
        ),
      );
    }

    modal.addComponents(...rows);
    return modal;
  }

  async storeValue(
    userId: string,
    object: ModalEditorValues<T>,
  ): Promise<string> {
    const guid = this.storedValues.add(object, 1000 * 60 * 60);

    await object.interaction.reply({
      ...((await this.getReply(
        object,
        guid,
        userId,
      )) as InteractionReplyOptions),
      ephemeral: true,
    });

    return guid;
  }

  getValue(guid: string): ModalEditorValues<T> | undefined {
    return this.storedValues.get(guid);
  }

  async editValue(userId: string, guid: string, partial: Partial<T>) {
    const existing = this.storedValues.get(guid);
    if (!existing) return;

    const updated: ModalEditorValues<T> = {
      ...existing,
      object: {
        ...existing.object,
        ...partial,
      },
    };

    this.storedValues.update(guid, updated, 1000 * 60 * 60);

    await updated.interaction.editReply({
      ...((await this.getReply(
        updated,
        guid,
        userId,
      )) as InteractionEditReplyOptions),
    });
  }

  async getReply(
    auction: ModalEditorValues<T>,
    guid: string,
    userId: string,
  ): Promise<InteractionEditReplyOptions | InteractionReplyOptions> {
    return {};
  }

  toLabel(key: string): string | undefined {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
  }

  getId(guid: string) {
    return guid;
  }
}
