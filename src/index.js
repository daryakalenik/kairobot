const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing');
}

console.log('Bot config loaded');

const newTaskWizard = new Scenes.WizardScene(
  'TASK_WIZARD',
  async ctx => {
    await ctx.reply('Send me the task title');
    return ctx.wizard.next();
  },
  async ctx => {
    const title = ctx.message.text;
    await ctx.reply(`Got it. Task title: ${title}`);
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([newTaskWizard]);
const bot = new Telegraf(botToken);

bot.use(session());
bot.use(stage.middleware());

bot.start(ctx =>
  ctx.reply(
    'Hi! I’m ReDue.\n' +
      'I help with recurring reminders and important dates.\n' +
      'I’m still in development, but I’m ready to chat.'
  )
);

bot.on(message(), ctx => {
  ctx.reply('👍' + ctx.message.text);
});

bot.command('newtask', ctx => ctx.scene.enter('TASK_WIZARD'));

bot.launch();
