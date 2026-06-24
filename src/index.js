const { Telegraf } = require('telegraf');
require('dotenv').config();

const { userStates } = require('./services/state.service');
const { tasks } = require('./services/task.service');
const { registerCommands } = require('./handlers/commands');
const { registerActions } = require('./handlers/actions');
const { registerMessages } = require('./handlers/messages');

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing');
}

const bot = new Telegraf(botToken);

registerCommands(bot, userStates);
registerActions(bot, { userStates, tasks });
registerMessages(bot, { userStates });

bot.launch();
