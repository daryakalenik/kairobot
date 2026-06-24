const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

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

function formatDate(date) {
  return dayjs(date).format('DD.MM.YYYY');
}

module.exports = {
  parseExactDate,
  parseComplexInterval,
  addInterval,
  formatDate,
};
