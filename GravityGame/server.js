import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OpenAI } from 'openai';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// serve up the web page from public directory
app.use(express.static('public'));

// Endpoint to receive game state and return action

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
}
);

app.post('/decide', async (req, res) => {
  const state = req.body;

  const prompt = `
You control the player's jumps. To jump to the next platform:
Set action to "jumpRight" or "jumpLeft"
Choose jumpPower so the player can reach the platform, considering gravity and current velocity

State:
${JSON.stringify(state, null, 2)}

Respond ONLY with the action string.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const action = completion.choices[0].message.content.trim();
    res.json({ action });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: 'Failed to call OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
