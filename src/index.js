const { Telegraf } = require('telegraf')
require('dotenv').config()

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing')
}

console.log('Bot config loaded');

const bot = new Telegraf(botToken)

bot.start((ctx) => ctx.reply('Hi! I’m ReDue.\n' +
    'I help with recurring reminders and important dates.\n' +
    'I’m still in development, but I’m ready to chat.'))

bot.launch()