const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.generateCaption = functions.https.onRequest(async (req, res) => {
  try {
    const {text} = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create a social media caption for: ${text}`,
          },
        ],
      }),
    });

    const data = await response.json();

    res.json({
      caption: data.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).send("Error generating caption");
  }
});
