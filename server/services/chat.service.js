import { handleChatMessage } from "../reasoning/conciergeChat.js";

import {
  stadiumGraph,
  predictions,
  incidents,
} from "../state/simulationState.js";

export async function handleChat(data) {
  const { message, locale = "en" } = data;

  const stadiumContext = {
    zones: stadiumGraph
      .getAllNodes()
      .filter((node) => node.type === "zone"),

    gates: stadiumGraph
      .getAllNodes()
      .filter((node) => node.type === "gate"),

    predictions,

    incidents,
  };

  return await handleChatMessage(
    message,
    stadiumContext,
    locale
  );
}