#!/usr/bin/env node

/**
 * Test script for Ollama tool calling functionality
 * Tests the updated native tool calling support
 */

const fetch = require("node-fetch");

// Define a simple weather tool
const weatherTool = {
  type: "function",
  function: {
    name: "get_current_weather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "The location to get the weather for, e.g. San Francisco, CA",
        },
        format: {
          type: "string",
          description: "The format to return the weather in",
          enum: ["celsius", "fahrenheit"],
        },
      },
      required: ["location", "format"],
    },
  },
};

// Define a calculator tool
const calculatorTool = {
  type: "function",
  function: {
    name: "calculate",
    description: "Perform basic math calculations",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["add", "subtract", "multiply", "divide"],
          description: "The math operation to perform",
        },
        a: {
          type: "number",
          description: "First number",
        },
        b: {
          type: "number",
          description: "Second number",
        },
      },
      required: ["operation", "a", "b"],
    },
  },
};

async function testOllamaTools() {
  console.log("🧪 Testing Ollama Tool Calling...\n");

  // Test 1: Weather query
  console.log("📍 Test 1: Weather Query");
  console.log("User: What is the weather in New York?");

  try {
    const weatherResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [
          {
            role: "user",
            content: "What is the weather in New York?",
          },
        ],
        tools: [weatherTool],
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: 32000,
        },
      }),
    });

    if (!weatherResponse.ok) {
      throw new Error(`HTTP error! status: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log("\nResponse:");

    if (weatherData.message?.tool_calls) {
      console.log("✅ Tool calls detected:");
      weatherData.message.tool_calls.forEach((call, index) => {
        console.log(`  Tool ${index + 1}: ${call.function.name}`);
        console.log(
          `  Arguments: ${JSON.stringify(call.function.arguments, null, 2)}`
        );
      });
    } else if (weatherData.message?.content) {
      console.log("📝 Content:", weatherData.message.content);
    }
  } catch (error) {
    console.error("❌ Weather test failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Math calculation
  console.log("🔢 Test 2: Math Calculation");
  console.log("User: What is 25 multiplied by 4?");

  try {
    const mathResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [
          {
            role: "user",
            content: "What is 25 multiplied by 4?",
          },
        ],
        tools: [calculatorTool],
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: 32000,
        },
      }),
    });

    if (!mathResponse.ok) {
      throw new Error(`HTTP error! status: ${mathResponse.status}`);
    }

    const mathData = await mathResponse.json();
    console.log("\nResponse:");

    if (mathData.message?.tool_calls) {
      console.log("✅ Tool calls detected:");
      mathData.message.tool_calls.forEach((call, index) => {
        console.log(`  Tool ${index + 1}: ${call.function.name}`);
        console.log(
          `  Arguments: ${JSON.stringify(call.function.arguments, null, 2)}`
        );
      });
    } else if (mathData.message?.content) {
      console.log("📝 Content:", mathData.message.content);
    }
  } catch (error) {
    console.error("❌ Math test failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Multiple tools available
  console.log("🛠️  Test 3: Multiple Tools Available");
  console.log("User: What is the weather in Tokyo and what is 10 plus 15?");

  try {
    const multiResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [
          {
            role: "user",
            content: "What is the weather in Tokyo and what is 10 plus 15?",
          },
        ],
        tools: [weatherTool, calculatorTool],
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: 32000,
        },
      }),
    });

    if (!multiResponse.ok) {
      throw new Error(`HTTP error! status: ${multiResponse.status}`);
    }

    const multiData = await multiResponse.json();
    console.log("\nResponse:");

    if (multiData.message?.tool_calls) {
      console.log("✅ Tool calls detected:");
      multiData.message.tool_calls.forEach((call, index) => {
        console.log(`  Tool ${index + 1}: ${call.function.name}`);
        console.log(
          `  Arguments: ${JSON.stringify(call.function.arguments, null, 2)}`
        );
      });
    } else if (multiData.message?.content) {
      console.log("📝 Content:", multiData.message.content);
    }
  } catch (error) {
    console.error("❌ Multiple tools test failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Test activateBrainArea function
  console.log("🧠 Test 4: Brain Area Activation (Project Specific)");
  console.log("User: I remember playing with my dog in the park");

  const brainAreaTool = {
    type: "function",
    function: {
      name: "activateBrainArea",
      description:
        "Activates a cognitive processing area of the AI system, defining the focus, relevance, and search parameters.",
      parameters: {
        type: "object",
        properties: {
          core: {
            type: "string",
            enum: [
              "memory",
              "valence",
              "metacognitive",
              "associative",
              "language",
              "planning",
              "unconscious",
              "archetype",
              "soul",
              "shadow",
              "body",
              "social",
              "self",
              "creativity",
              "intuition",
              "will",
            ],
            description: "Cognitive area to activate.",
          },
          intensity: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Relevance intensity (0-1) for this cognitive area.",
          },
          symbolic_query: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Main query or search term.",
              },
            },
            required: ["query"],
            description: "Query structure for semantic search.",
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Keywords for expanded search.",
          },
        },
        required: ["core", "intensity", "symbolic_query"],
      },
    },
  };

  try {
    const brainResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages: [
          {
            role: "system",
            content: `Analyze user input and activate relevant cognitive areas using the activateBrainArea function.
You MUST use the activateBrainArea function to respond. Do not respond with plain text.`,
          },
          {
            role: "user",
            content: "I remember playing with my dog in the park",
          },
        ],
        tools: [brainAreaTool],
        tool_choice: "required",
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: 32000,
        },
      }),
    });

    if (!brainResponse.ok) {
      throw new Error(`HTTP error! status: ${brainResponse.status}`);
    }

    const brainData = await brainResponse.json();
    console.log("\nResponse:");
    console.log("Full response:", JSON.stringify(brainData, null, 2));

    if (brainData.message?.tool_calls) {
      console.log("✅ Tool calls detected:");
      brainData.message.tool_calls.forEach((call, index) => {
        console.log(`  Tool ${index + 1}: ${call.function.name}`);
        console.log(
          `  Arguments: ${JSON.stringify(call.function.arguments, null, 2)}`
        );
      });
    } else if (brainData.message?.content) {
      console.log("📝 Content:", brainData.message.content);
    }
  } catch (error) {
    console.error("❌ Brain area test failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 5: Check available models
  console.log("🦙 Checking available models with tool support...");

  try {
    const modelsResponse = await fetch("http://localhost:11434/api/tags");
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      const toolSupportModels = [
        "qwen3",
        "qwen2.5",
        "llama3.1",
        "llama4",
        "command-r",
        "mistral-nemo",
      ];

      console.log("\nInstalled models with tool support:");
      modelsData.models?.forEach((model) => {
        const modelBase = model.name.split(":")[0];
        if (
          toolSupportModels.some((supported) => modelBase.includes(supported))
        ) {
          console.log(`  ✅ ${model.name}`);
        }
      });
    }
  } catch (error) {
    console.error("❌ Failed to check models:", error.message);
  }

  console.log("\n✨ Tool calling tests completed!");
}

// Run the tests
testOllamaTools().catch(console.error);
