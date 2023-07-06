require('dotenv').config();

const {Telegraf} = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('Welcome to the GitHub bot!');
});