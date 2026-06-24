function registerCommands(bot, userStates) {
  bot.start(ctx =>
    ctx.reply(
      'Hi! I’m Kairo.\n' +
        'I help with recurring reminders and important dates.\n' +
        'I’m still in development, but I’m ready to chat.'
    )
  );

  bot.command('newtask', async ctx => {
    userStates.set(ctx.from.id, {
      step: 'waiting_for_task_name',
      draftTask: {},
    });

    await ctx.reply('Send me the task name');
  });
}

module.exports = {
  registerCommands,
};
