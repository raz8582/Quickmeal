import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/webhook", async (req, res) => {
  try {
    const parameters = req.body.queryResult?.parameters || {};
    console.log("Dialogflow parameters:", parameters);

    // Get ingredients (ensure it's a string)
    let ingredients = parameters.ingredient || [];
    if (!Array.isArray(ingredients)) {
      ingredients = [ingredients];
    }
    const ingredientList = ingredients.join(", ") || "any available ingredients";

    // Get time (fallback to default)
    let time = parameters.time || "";
    if (!time || time.trim() === "") {
      time = "20 minutes"; // default fallback
    }

    // Create the OpenAI prompt
    const prompt = `Suggest a simple meal recipe using ${ingredientList}. 
It should take about ${time} to prepare. 
Return the recipe name, ingredients list, and short instructions.`;

    console.log("OpenAI Prompt:", prompt);

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    const meal =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a meal.";

    // Send back to Dialogflow
    res.json({ fulfillmentText: meal });
  } catch (error) {
    console.error("Error in webhook:", error);
    res.json({
      fulfillmentText: "Sorry, something went wrong generating your meal.",
    });
  }
});

app.listen(3000, () => {
  console.log("Webhook server is running on port 3000");
});
