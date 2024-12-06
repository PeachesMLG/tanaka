import { InventoryItem } from '../types/inventoryItem';
import axios from 'axios';

export async function getInventoryItemsByCard(
  cardId: string,
): Promise<InventoryItem[]> {
  const url = `https://api.mazoku.cc/api/get-inventory-items-by-card/${cardId}`;

  const response = await axios.get<InventoryItem[]>(url);
  return response.data;
}

export async function getRemainingVersionsByCard(
  cardId: string,
  maxVersion: number,
): Promise<number[]> {
  const inventoryItems = await getInventoryItemsByCard(cardId);
  const currentVersions = inventoryItems.map((item) => item.version);

  const availableVersions = new Set<number>();
  for (let i = 1; i <= maxVersion; i++) {
    availableVersions.add(i);
  }

  currentVersions.forEach((number) => availableVersions.delete(number));

  return Array.from(availableVersions);
}
