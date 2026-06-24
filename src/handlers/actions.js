const { userStates } = require('../services/state.service');
const { addInterval } = require('../utils/date');
const { buildTaskSummary } = require('../utils/format');
const { Markup } = require('telegraf');
const { tasks } = require('../services/task.service');

function registerActions(bot) {
  bot.action('date_type_exact', async ctx => {
    const state = userStates.get(ctx.from.id);

    if (!state) return;

    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_exact_date',
      draftTask: {
        ...state.draftTask,
        scheduleType: 'exact',
      },
    });

    await ctx.editMessageText('Enter date in format DD.MM.YYYY\nExample: 25.12.2026');
    await ctx.answerCbQuery();
  });

  bot.action('date_type_quick', async ctx => {
    const state = userStates.get(ctx.from.id);

    if (!state) return;

    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_quick_interval',
    });

    await ctx.editMessageText(
      'Choose a quick interval',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('1 day', 'quick_1_day'),
          Markup.button.callback('3 days', 'quick_3_day'),
        ],
        [
          Markup.button.callback('7 days', 'quick_7_day'),
          Markup.button.callback('2 weeks', 'quick_2_week'),
        ],
        [
          Markup.button.callback('1 month', 'quick_1_month'),
          Markup.button.callback('3 months', 'quick_3_month'),
        ],
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action('date_type_custom', async ctx => {
    const state = userStates.get(ctx.from.id);

    if (!state) return;

    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_custom_interval',
      draftTask: {
        ...state.draftTask,
        scheduleType: 'custom_interval',
      },
    });

    await ctx.editMessageText(
      'Enter interval in format:\n' +
        '1м 2д\n' +
        '2н 3д\n' +
        '1г 1м\n\n' +
        'Allowed units:\n' +
        'г — years\n' +
        'м — months\n' +
        'н — weeks\n' +
        'д — days'
    );
    await ctx.answerCbQuery();
  });

  const quickIntervals = {
    quick_1_day: { days: 1 },
    quick_3_day: { days: 3 },
    quick_7_day: { days: 7 },
    quick_2_week: { weeks: 2 },
    quick_1_month: { months: 1 },
    quick_3_month: { months: 3 },
  };

  Object.keys(quickIntervals).forEach(actionName => {
    bot.action(actionName, async ctx => {
      const state = userStates.get(ctx.from.id);

      if (!state) return;

      const interval = quickIntervals[actionName];
      const dueDate = addInterval(new Date(), interval);

      userStates.set(ctx.from.id, {
        ...state,
        step: 'waiting_for_confirmation',
        draftTask: {
          ...state.draftTask,
          scheduleType: 'relative',
          interval,
          dueDate,
        },
      });

      await ctx.editMessageText(
        buildTaskSummary(userStates.get(ctx.from.id).draftTask),
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Save', 'task_confirm_create')],
          [Markup.button.callback('❌ Cancel', 'task_cancel_create')],
        ])
      );
      await ctx.answerCbQuery();
    });
  });

  bot.action('task_confirm_create', async ctx => {
    const state = userStates.get(ctx.from.id);

    if (!state) return;

    tasks.push({
      id: Date.now(),
      userId: ctx.from.id,
      ...state.draftTask,
      createdAt: new Date(),
    });

    userStates.delete(ctx.from.id);

    await ctx.editMessageText('Task created successfully');
    await ctx.answerCbQuery();
  });

  bot.action('task_cancel_create', async ctx => {
    userStates.delete(ctx.from.id);

    await ctx.editMessageText('Task creation canceled');
    await ctx.answerCbQuery();
  });
}

module.exports = {
  registerActions,
};
