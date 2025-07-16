import dotenv from 'dotenv';
dotenv.config(); // Make 100% sure .env is loaded BEFORE using process.env

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('❌ OPENAI_API_KEY is missing. Check your .env file.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default openai;
