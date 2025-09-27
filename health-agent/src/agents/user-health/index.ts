import type {
  AgentContext,
  AgentRequest,
  AgentResponse,
  AgentWelcomeResult,
} from "@agentuity/sdk";
import z from "zod";
import { stepCountIs, streamText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { err, ok, ResultAsync } from "neverthrow";

const openai = createOpenAI();

const SYSTEM_PROMPT = `
You are an agent who's job is do produce a summary of a given user's health.

You will have access to a variety of tools to get information about the user.

Use the tools to get the information you need to produce a summary of the user's health.

The only thing you should respond with is the summary of the user's health.

It should be in markdown, following this format:

## {user name} Health Summary
{today's date}

- weight: {weight}
- height: {height}
- bmi: {bmi}
- body fat percentage: {body fat percentage}
- age: {age}
- gender: {gender}

### summary

{short summary of the user's health}

### key areas of concern

{list of key areas of concern}

### key recommendations

{list of key recommendations}
`;

const getTodayDateTool = tool({
  name: "get_today_date",
  description: "Get the today's date",
  inputSchema: z.object({}),
  execute: async () => {
    return `Today's date is ${new Date().toISOString().split("T")[0]}`;
  },
});

const getUserProfileTool = tool({
  name: "get_user_profile",
  description:
    "Get a user's profile out of the database (contains name, gender, and other app specific data)",
  inputSchema: z.object({
    user_id: z.string(),
  }),
  execute: async ({ user_id }) => {
    return {
      user_id,
      name: "Ben Davis",
      gender: "male",
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    };
  },
});

const getUserHeightTool = tool({
  name: "get_user_height",
  description: "Get a user's height out of the database",
  inputSchema: z.object({
    user_id: z.string(),
  }),
  execute: async ({ user_id }) => {
    return `User ${user_id}'s height is 5 feet 10 inches`;
  },
});

const getUserBodyFatPercentageTool = tool({
  name: "get_user_body_fat_percentage",
  description: "Get a user's body fat percentage out of the database",
  inputSchema: z.object({
    user_id: z.string(),
  }),
  execute: async ({ user_id }) => {
    return `User ${user_id}'s body fat percentage is 20%`;
  },
});

const getUserAgeTool = tool({
  name: "get_user_age",
  description: "Get a user's age out of the database",
  inputSchema: z.object({
    user_id: z.string(),
  }),
  execute: async ({ user_id }) => {
    return `User ${user_id}'s age is 23`;
  },
});

const getUserWeightTool = tool({
  name: "get_user_weight",
  description: "Get a user's weight out of the database",
  inputSchema: z.object({
    user_id: z.string(),
  }),
  execute: async ({ user_id }) => {
    return `User ${user_id}'s weight is 193 pounds`;
  },
});

const agentHandlerRunAgent = async (
  input: { user_id: string },
  resp: AgentResponse,
  ctx: AgentContext
) => {
  const { user_id } = input;

  const [textStreamBucketResult, fullStreamBucketResult] = await Promise.all([
    ResultAsync.fromPromise(
      ctx.stream.create("health-demo-text-stream", {
        contentType: "text/plain",
        metadata: {
          user_id,
        },
      }),
      (error) => new Error("Failed to create text stream bucket")
    ),
    ResultAsync.fromPromise(
      ctx.stream.create("health-demo-full-stream", {
        contentType: "text/plain",
        metadata: {
          user_id,
        },
      }),
      (error) => new Error("Failed to create full stream bucket")
    ),
  ]);

  if (fullStreamBucketResult.isErr()) {
    return resp.json({ error: fullStreamBucketResult.error.message });
  }

  if (textStreamBucketResult.isErr()) {
    return resp.json({ error: textStreamBucketResult.error.message });
  }

  const fullStreamBucket = fullStreamBucketResult.value;
  const textStreamBucket = textStreamBucketResult.value;

  ctx.waitUntil(async () => {
    const { fullStream, textStream } = streamText({
      model: openai("gpt-5-mini"),
      system: SYSTEM_PROMPT,
      tools: {
        getUserWeightTool,
        getUserHeightTool,
        getUserBodyFatPercentageTool,
        getUserAgeTool,
        getUserProfileTool,
        getTodayDateTool,
      },
      onError: (error) => {
        ctx.logger.error("Error generating text", { error });
      },
      onFinish: (completion) => {
        ctx.logger.info("Text generation finished", completion.text);
      },
      stopWhen: stepCountIs(10),
      providerOptions: {
        openai: {
          parallelToolCalls: true,
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
      toolChoice: "auto",
      messages: [
        {
          role: "user",
          content: `User ID: ${user_id}`,
        },
      ],
    });

    await Promise.all([
      fullStream.pipeTo(fullStreamBucket),
      textStream.pipeTo(textStreamBucket),
    ]);
  });

  return resp.json({
    fullStreamId: fullStreamBucket.id,
    fullStreamUrl: fullStreamBucket.url,
    textStreamId: textStreamBucket.id,
    textStreamUrl: textStreamBucket.url,
  });
};

const agentHandlerGetStream = async (
  input: { stream_id: string },
  resp: AgentResponse,
  ctx: AgentContext
) => {
  const { stream_id } = input;

  // would be cool to be able to fetch the stream again here

  return resp.json({
    streamUrl: `https://streams.agentuity.cloud/${stream_id}`,
  });
};

const agentInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run"),
    user_id: z.string(),
  }),
  z.object({
    type: z.literal("get"),
    stream_id: z.string(),
  }),
]);

export const welcome = (): AgentWelcomeResult => {
  return {
    welcome:
      "Health Agent Demo. Takes in a json payload that will either run the agent, or fetch a stream",
    prompts: [
      {
        data: JSON.stringify({
          type: "run",
          user_id: "brotherman_bill",
        }),
        contentType: "application/json",
      },
      {
        data: JSON.stringify({
          type: "get",
          stream_id: "your-stream-id",
        }),
        contentType: "application/json",
      },
    ],
  };
};

export default async function Agent(
  req: AgentRequest,
  resp: AgentResponse,
  ctx: AgentContext
) {
  const inputJsonResult = await ResultAsync.fromPromise(
    req.data.json(),
    () =>
      new Error(
        "Failed to parse input JSON, did not receive a valid JSON object"
      )
  ).andThen((json) => {
    const parseResult = agentInputSchema.safeParse(json);
    if (!parseResult.success) {
      return err(
        new Error("Failed to parse input JSON, was not in the expected format")
      );
    }
    return ok(parseResult.data);
  });

  if (inputJsonResult.isErr()) {
    return resp.json({ error: inputJsonResult.error.message });
  }

  const input = inputJsonResult.value;

  if (input.type === "run") {
    return agentHandlerRunAgent(input, resp, ctx);
  } else {
    return agentHandlerGetStream(input, resp, ctx);
  }
}
