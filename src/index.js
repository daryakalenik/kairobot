const { Telegraf, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
require('dotenv').config();

dayjs.extend(customParseFormat);

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing');
}

console.log('Bot config loaded');

const bot = new Telegraf(botToken);

const userStates = new Map();
const tasks = [];

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

bot.on(message('text'), async ctx => {
  const text = ctx.message.text.trim();

  if (text.startsWith('/')) return;

  const userId = ctx.from.id;
  const state = userStates.get(userId);

  if (!state) return;

  await handleTextMessage(ctx, state, text);
});

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

function parseExactDate(text) {
  const parsed = dayjs(text, 'DD.MM.YYYY', true);

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.toDate();
}

function parseComplexInterval(input) {
  const text = input.trim().toLowerCase();

  if (!/^(\d+\s*[гмнд]\s*)+$/.test(text)) {
    return null;
  }

  const matches = [...text.matchAll(/(\d+)\s*([гмнд])/g)];

  const interval = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
  };

  for (const [, valueRaw, unit] of matches) {
    const value = Number(valueRaw);

    if (unit === 'г') {
      interval.years += value;
    } else if (unit === 'м') {
      interval.months += value;
    } else if (unit === 'н') {
      interval.weeks += value;
    } else if (unit === 'д') {
      interval.days += value;
    }
  }

  return interval;
}

function addInterval(date, interval) {
  let result = dayjs(date);

  if (interval.years) {
    result = result.add(interval.years, 'year');
  }

  if (interval.months) {
    result = result.add(interval.months, 'month');
  }

  if (interval.weeks) {
    result = result.add(interval.weeks, 'week');
  }

  if (interval.days) {
    result = result.add(interval.days, 'day');
  }

  return result.toDate();
}

function buildTaskSummary(task) {
  return 'Check your task:\n' + `Title: ${task.title}\n` + `Due date: ${formatDate(task.dueDate)}`;
}

function formatDate(date) {
  return dayjs(date).format('DD.MM.YYYY');
}

bot.launch();
