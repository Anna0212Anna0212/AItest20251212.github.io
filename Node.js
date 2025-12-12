// example serverless (Netlify Function) - handler.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if(event.httpMethod !== 'POST') return { statusCode: 405 };
  const body = JSON.parse(event.body);
  const prompt = body.prompt || '';
  // call OpenAI
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // 或選你有的 model
      messages: [{role:'user', content: prompt}],
      max_tokens: 400
    })
  });
  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content || '';
  return { statusCode: 200, body: JSON.stringify({ answer }) };
};
