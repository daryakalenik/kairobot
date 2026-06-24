const { message } = require('telegraf/filters');
const { userStates } = require('../services/state.service');
const { Markup } = require('telegraf');
const { parseExactDate, parseComplexInterval, addInterval } = require('../utils/date');
const { buildTaskSummary } = require('../utils/format');

function registerMessages(bot) {
  async function handleTaskName(ctx, state, text) {
    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_date_type',
      draftTask: {
        ...state.draftTask,
        title: text,
      },
    });

    await ctx.reply(
      'When should I remind you?',
      Markup.inlineKeyboard([
        [Markup.button.callback('📅 Exact date', 'date_type_exact')],
        [Markup.button.callback('⚡ Quick interval', 'date_type_quick')],
        [Markup.button.callback('🧩 Custom interval', 'date_type_custom')],
      ])
    );
  }

  async function handleExactDate(ctx, state, text) {
    const dueDate = parseExactDate(text);

    if (!dueDate) {
      await ctx.reply('Invalid date format.\nPlease use DD.MM.YYYY\nExample: 25.12.2026');

      return;
    }

    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_confirmation',
      draftTask: {
        ...state.draftTask,
        dueDate,
      },
    });

    await ctx.reply(
      buildTaskSummary(userStates.get(ctx.from.id).draftTask),
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Save', 'task_confirm_create')],
        [Markup.button.callback('❌ Cancel', 'task_cancel_create')],
      ])
    );
  }

  async function handleCustomInterval(ctx, state, text) {
    const interval = parseComplexInterval(text);

    if (!interval) {
      await ctx.reply(
        'Invalid interval format.\n\n' + 'Examples:\n' + '1м 2д\n' + '2н 3д\n' + '1г 1м'
      );

      return;
    }

    const dueDate = addInterval(new Date(), interval);

    userStates.set(ctx.from.id, {
      ...state,
      step: 'waiting_for_confirmation',
      draftTask: {
        ...state.draftTask,
        interval,
        dueDate,
      },
    });

    await ctx.reply(
      buildTaskSummary(userStates.get(ctx.from.id).draftTask),
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Save', 'task_confirm_create')],
        [Markup.button.callback('❌ Cancel', 'task_cancel_create')],
      ])
    );
  }

  async function handleTextMessage(ctx, state, text) {
    switch (state.step) {
      case 'waiting_for_task_name':
        return handleTaskName(ctx, state, text);
      case 'waiting_for_exact_date':
        return handleExactDate(ctx, state, text);
      case 'waiting_for_custom_interval':
        return handleCustomInterval(ctx, state, text);
      default:
        return;
    }
  }

  bot.on(message('text'), async ctx => {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) return;

    const userId = ctx.from.id;
    const state = userStates.get(userId);

    if (!state) return;

    await handleTextMessage(ctx, state, text);
  });
}

module.exports = {
  registerMessages,
};
