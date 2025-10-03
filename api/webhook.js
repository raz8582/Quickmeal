const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.post("/webhook", (req, res) => {
  try {
    // Get parameters from Dialogflow
    let ingredients = req.body.queryResult.parameters.ingredient;
    let time = req.body.queryResult.parameters.time.amount;

    // Normalize ingredients to always be an array
    if (!Array.isArray(ingredients)) {
      ingredients = ingredients.split(",").map(i => i.trim());
    }

    // Generate a simple step-by-step recipe
    let steps = [
      `Prepare your ingredients: ${ingredients.join(", ")}.`,
      `Heat some oil in a pan over medium heat.`,
      `Add the chicken (or main protein) first and cook until browned.`,
    ];

    // Add remaining ingredients
    const otherIngredients = ingredients.filter(i => i.toLowerCase() !== "chicken");
    if (otherIngredients.length > 0) {
      steps.push(`Add ${otherIngredients.join(", ")} and sauté for a few minutes.`);
    }

    steps.push(`Cover and cook for about ${time} minutes until everything is tender.`);
    steps.push("Serve hot and enjoy your meal!");

    // Send response to Dialogflow
    res.json({
      fulfillmentMessages: [
        {
          text: {
            text: [steps.join(" ")]
          }
        }
      ]
    });

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Webhook error");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server is running on port ${PORT}`);
});
