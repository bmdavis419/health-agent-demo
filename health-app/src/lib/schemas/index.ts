import z from 'zod';

// Better discriminated union schema based on actual stream chunk data
const betterStreamChunkSchema = z.discriminatedUnion('type', [
	// Simple types with just type
	z.object({ type: z.literal('start') }),
	z.object({ type: z.literal('finish') }),
	z.object({ type: z.literal('start-step') }),
	z.object({ type: z.literal('finish-step') }),

	// Reasoning types
	z.object({
		type: z.literal('reasoning-start'),
		id: z.string()
	}),
	z.object({
		type: z.literal('reasoning-delta'),
		id: z.string(),
		text: z.string()
	}),
	z.object({
		type: z.literal('reasoning-end'),
		id: z.string()
	}),

	// Tool input types
	z.object({
		type: z.literal('tool-input-start'),
		id: z.string(),
		toolName: z.string()
	}),
	z.object({
		type: z.literal('tool-input-delta'),
		id: z.string(),
		delta: z.string()
	}),
	z.object({
		type: z.literal('tool-input-end'),
		id: z.string()
	}),

	// Tool execution types
	z.object({
		type: z.literal('tool-call'),
		toolName: z.string(),
		input: z.record(z.any(), z.any()),
		toolCallId: z.string()
	}),
	z.object({
		type: z.literal('tool-result'),
		toolName: z.string(),
		input: z.record(z.any(), z.any()),
		output: z.union([z.string(), z.record(z.any(), z.any())]),
		toolCallId: z.string()
	}),

	// Text output types
	z.object({
		type: z.literal('text-start'),
		id: z.string()
	}),
	z.object({
		type: z.literal('text-delta'),
		id: z.string(),
		text: z.string()
	}),
	z.object({
		type: z.literal('text-end'),
		id: z.string()
	})
]);

// Original loose schema for backward compatibility
const streamChunkSchema = z.object({
	type: z.enum([
		'text-start',
		'text-delta',
		'text-end',
		'tool-input-start',
		'tool-input-delta',
		'tool-input-end',
		'tool-call',
		'tool-result',
		'start',
		'finish',
		'start-step',
		'finish-step',
		'reasoning-start',
		'reasoning-end',
		'reasoning-delta'
	]),
	id: z.string().optional(),
	delta: z.string().optional(),
	toolName: z.string().optional(),
	input: z.union([z.string(), z.record(z.any(), z.any())]).optional(),
	output: z.union([z.string(), z.record(z.any(), z.any())]).optional(),
	toolCallId: z.string().optional(),
	inputTextDelta: z.string().optional(),
	text: z.string().optional()
});

type BetterStreamChunk = z.infer<typeof betterStreamChunkSchema>;
type StreamChunk = z.infer<typeof streamChunkSchema>;

export { betterStreamChunkSchema, streamChunkSchema, type BetterStreamChunk, type StreamChunk };
