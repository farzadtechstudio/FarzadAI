import { promises as fs } from "fs";
import path from "path";
import {
  BRAND_CONFIG,
  WELCOME_CONFIG,
  AI_CONFIG,
  TOPIC_CARDS,
  ADMIN_USERS,
} from "./config";

interface SetupConfig {
  brand: typeof BRAND_CONFIG;
  welcome: typeof WELCOME_CONFIG;
  ai: typeof AI_CONFIG;
  topicCards: typeof TOPIC_CARDS;
  admin: (typeof ADMIN_USERS)[0];
  setupCompleted: boolean;
}

let cachedConfig: SetupConfig | null = null;

export async function loadSetupConfig(): Promise<SetupConfig | null> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), "src", "lib", "setup-config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    if (config.setupCompleted) {
      cachedConfig = config;
      return config;
    }
  } catch {
    // File doesn't exist or is invalid - use default config
  }

  return null;
}

export async function getBrandConfig() {
  const setup = await loadSetupConfig();
  return setup?.brand || BRAND_CONFIG;
}

export async function getWelcomeConfig() {
  const setup = await loadSetupConfig();
  return setup?.welcome || WELCOME_CONFIG;
}

export async function getAIConfig() {
  const setup = await loadSetupConfig();
  if (setup?.ai) {
    return {
      model: setup.ai.model || AI_CONFIG.model,
      max_tokens: setup.ai.max_tokens || AI_CONFIG.max_tokens,
      temperature: setup.ai.temperature || AI_CONFIG.temperature,
      system_prompt: setup.ai.system_prompt || AI_CONFIG.system_prompt,
    };
  }
  return AI_CONFIG;
}

export async function getTopicCards() {
  const setup = await loadSetupConfig();
  return setup?.topicCards || TOPIC_CARDS;
}

export async function getAdminUsers() {
  const setup = await loadSetupConfig();
  if (setup?.admin) {
    return [setup.admin];
  }
  return ADMIN_USERS;
}

export async function isSetupCompleted(): Promise<boolean> {
  const setup = await loadSetupConfig();
  return setup?.setupCompleted || false;
}

// Clear cached config (useful when config is updated)
export function clearConfigCache() {
  cachedConfig = null;
}
