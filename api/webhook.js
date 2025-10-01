export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const queryText = req.body.queryResult?.queryText || "";

    // Extract duration (fallback = 15 minutes)
    const timeMatch = queryText.match(/(\d+)\s*(min|mins|minutes|hour|hours)/i);
    const timeText = timeMatch
      ? `${timeMatch[1]} ${timeMatch[2]}`
      : "15 minutes";

    // Extract ingredients directly from user text
    // No need to hardcode a list anymore
    const ingredientMatch = queryText.match(/have (.+?) (?:in|within|that takes|prepare|cook|make)?/i);
    const ingredients =
      ingredientMatch && ingredientMatch[1]
        ? ingredientMatch[1].replace(/and/gi, ",").trim()
        : "";

    if (!ingredients) {
      return res.status(200).json({
        fulfillmentText: "Which ingredients do you have?",
      });
    }

    // Create a prompt
    const prompt = `You are a helpful cooking assistant. Suggest ONE quick meal that can be prepared in ${timeText} using these ingredients: ${ingredients}. 
Reply with the meal name and short instructions only.`;

    // --- Call OpenAI Chat API ---
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const openaiData = await openaiRes.json();
    console.log("DEBUG OpenAI Response:", JSON.stringify(openaiData, null, 2));

    // Safe extraction
    let mealSuggestion = "Sorry, I could not generate a meal.";
    if (openaiData?.choices?.length > 0) {
      mealSuggestion =
        openaiData.choices[0].message?.content?.trim() ||
        openaiData.choices[0].text?.trim() ||
        mealSuggestion;
    }

    return res.status(200).json({ fulfillmentText: mealSuggestion });
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({
      fulfillmentText: "Server error occurred. Please try again.",
    });
  }
}
