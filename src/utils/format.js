const { formatDate } = require('./date');

function buildTaskSummary(task) {
  return 'Check your task:\n' + `Title: ${task.title}\n` + `Due date: ${formatDate(task.dueDate)}`;
}

module.exports = {
  buildTaskSummary,
};
