const log = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
};

const logError = (...args) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR:`, ...args);
};

module.exports = { log, logError };