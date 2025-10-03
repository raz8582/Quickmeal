import dotenv from "dotenv";
dotenv.config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const parameters = req.body.queryResult?.parameters || {};
    let ingredients = parameters.ingredient || [];
    let timeAmount = parameters.time?.amount; // in minutes

    // --- Validate missing parameters ---
    if (!ingredients.length && !timeAmount) {
      return res.status(200).json({ fulfillmentText: "Which ingredients do you have and how much time do you have to cook?" });
    } else if (!ingredients.length) {
      return res.status(200).json({ fulfillmentText: "Which ingredients do you have?" });
    } else if (!timeAmount) {
      return res.status(200).json({ fulfillmentText: "How much time do you have to cook?" });
    }

    // --- Both parameters present, generate meal ---
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ fulfillmentText: "Server configuration error: missing API key." });
    }

    const timeText = `${timeAmount} minutes`;
    const prompt = `Suggest a quick meal in ${timeText} using these ingredients: ${ingredients.join(", ")}. Keep instructions short.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a cooking assistant. Respond with a quick meal idea and short instructions only." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const mealSuggestion = data.choices?.[0]?.message?.content?.trim() || "Sorry, I could not generate a meal.";

    return res.status(200).json({ fulfillmentText: mealSuggestion });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({ fulfillmentText: "Server error occurred." });
  }
}
