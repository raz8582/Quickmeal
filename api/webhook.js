let isFetching = false; // Prevent multiple simultaneous calls
const cache = {};       // Simple in-memory cache

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getMealSuggestion") {
    const queryText = (message.queryText || "").toLowerCase();

    // --- Extract time ---
    const timeMatch = queryText.match(/(\d+)\s*(min|mins|minutes)/i);
    const timeText = timeMatch ? `${timeMatch[1]} minutes` : "15 minutes";

    // --- Extract ingredients ---
    const possibleIngredients = [
      "chicken","beef","pasta","tomatoes","rice","broccoli",
      "cheese","potatoes","onion","garlic","carrot","bell pepper","fish","parsley"
    ];
    const ingredients = possibleIngredients.filter(item => queryText.includes(item));

    if (!ingredients.length) {
      sendResponse({ fulfillmentText: "Which ingredients do you have?" });
      return true;
    }

    const cacheKey = `${timeText}|${ingredients.sort().join(",")}`;

    if (cache[cacheKey]) {
      sendResponse({ fulfillmentText: cache[cacheKey] });
      return true;
    }

    if (isFetching) {
      sendResponse({ fulfillmentText: "Please wait, generating your meal..." });
      return true;
    }

    isFetching = true;

    // --- Retrieve API key from chrome.storage ---
    chrome.storage.local.get("OPENAI_API_KEY", ({ OPENAI_API_KEY }) => {
      if (!OPENAI_API_KEY) {
        console.error("OpenAI API key not found in chrome.storage");
        sendResponse({ fulfillmentText: "Server configuration error: missing API key." });
        isFetching = false;
        return;
      }

      // --- Async IIFE to call OpenAI ---
      (async () => {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a cooking assistant. Respond with a quick meal idea and short instructions only.",
                },
                {
                  role: "user",
                  content: `Suggest a quick meal in ${timeText} using these ingredients: ${ingredients.join(", ")}.`,
                },
              ],
              max_tokens: 150,
            }),
          });

          const data = await response.json();
          const mealSuggestion = data.choices?.[0]?.message?.content?.trim()
            || "Sorry, I could not generate a meal.";

          cache[cacheKey] = mealSuggestion; // Save to cache
          sendResponse({ fulfillmentText: mealSuggestion });

        } catch (err) {
          console.error("OpenAI fetch error:", err);
          sendResponse({ fulfillmentText: "Server error occurred." });
        } finally {
          isFetching = false;
        }
      })();
    });

    return true; // Must return true to indicate async response
  }
});
