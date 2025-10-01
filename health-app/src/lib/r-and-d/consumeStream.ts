import { Result, ResultAsync } from 'neverthrow';
import z from 'zod';

type SseStream<Chunk> = {
	streamChunkType: 'sse';
	chunkSchema: z.ZodType<Chunk>;
};

type TextStream = {
	streamChunkType: 'text';
	chunkSchema: z.ZodType<string>;
};

type Stream<Chunk> = SseStream<Chunk> | TextStream;

class StreamError extends Error {
	__name__ = 'StreamError';
	isFatal: boolean;
	constructor(message: string, isFatal: boolean) {
		super(message);
		this.isFatal = isFatal;
	}
}

type OnCompleteCallback = (data: {
	totalChunks: number;
	totalBytes: number;
	duration: number;
	didFatalError: boolean;
}) => void | Promise<void>;
type OnErrorCallback = (error: StreamError) => void | Promise<void>;
type OnChunkCallback<Chunk> = (chunk: Chunk, index: number) => void | Promise<void>;
type OnStartCallback = () => void | Promise<void>;

type CreateStreamConsumer = <Chunk>(
	stream: Stream<Chunk>,
	args: {
		onComplete: OnCompleteCallback;
		onError: OnErrorCallback;
		onChunk: OnChunkCallback<Chunk>;
		onStart: OnStartCallback;
	}
) => {
	start: (url: string) => void;
	stop: () => void;
};

const createStreamConsumer: CreateStreamConsumer = (stream, args) => {
	const { onComplete, onError, onChunk, onStart } = args;
	const controller = new AbortController();
	const signal = controller.signal;
	const { chunkSchema, streamChunkType } = stream;

	const internalRunStream = async (url: string) => {
		let totalChunks = 0;
		let totalBytes = 0;
		let index = 0;
		const startTime = Date.now();

		const handleFinish = async (didFatalError: boolean) => {
			await Promise.resolve(
				onComplete({
					totalChunks,
					totalBytes,
					duration: Date.now() - startTime,
					didFatalError
				})
			);
		};

		const response = await ResultAsync.fromPromise(fetch(url, { signal }), (error) => {
			return new StreamError(
				`Failed to fetch stream: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		});

		if (response.isErr()) {
			await Promise.resolve(onError(response.error));
			await handleFinish(true);
			return;
		}

		const reader = response.value.body?.getReader();
		if (!reader) {
			await Promise.resolve(onError(new StreamError('Failed to get reader', true)));
			await handleFinish(true);
			return;
		}

		const decoder = new TextDecoder();

		// TEXT STREAM IMPLEMENTATION
		if (streamChunkType === 'text') {
			let done = false;
			while (!done && !signal.aborted) {
				const readResult = await ResultAsync.fromPromise(reader.read(), (error) => {
					return new StreamError(
						`Failed to read stream: ${error instanceof Error ? error.message : String(error)}`,
						true
					);
				});

				if (readResult.isErr()) {
					await Promise.resolve(onError(readResult.error));
					done = true;
					continue;
				}

				const { value, done: streamDone } = readResult.value;
				done = streamDone;

				if (!value) continue;

				const chunkResult = Result.fromThrowable(
					() => decoder.decode(value, { stream: !done }),
					(error) => {
						return new StreamError(
							`Failed to decode stream chunk: ${error instanceof Error ? error.message : String(error)}`,
							false
						);
					}
				)();

				if (chunkResult.isErr()) {
					await Promise.resolve(onError(chunkResult.error));
					continue;
				}

				const validatedChunkResult = chunkSchema.safeParse(chunkResult.value);

				if (!validatedChunkResult.success) {
					await Promise.resolve(
						onError(
							new StreamError(
								`Failed to validate stream chunk: ${validatedChunkResult.error.message}`,
								false
							)
						)
					);
					continue;
				}

				// this will have type safety because of the types from the schema
				await Promise.resolve(onChunk(validatedChunkResult.data as any, index));
				index += 1;
				totalChunks += 1;
				totalBytes += value.length;
			}
		}

		// SSE STREAM IMPLEMENTATION
		if (streamChunkType === 'sse') {
			let done = false;
			let buffer = '';

			while (!done && !signal.aborted) {
				const readResult = await ResultAsync.fromPromise(reader.read(), (error) => {
					return new StreamError(
						`Failed to read stream: ${error instanceof Error ? error.message : String(error)}`,
						true
					);
				});

				if (readResult.isErr()) {
					await Promise.resolve(onError(readResult.error));
					done = true;
					continue;
				}

				const { value, done: streamDone } = readResult.value;
				done = streamDone;

				if (!value) continue;

				const bufferResult = Result.fromThrowable(
					() => decoder.decode(value, { stream: !done }),
					(error) => {
						return new StreamError(
							`Failed to decode stream chunk: ${error instanceof Error ? error.message : String(error)}`,
							false
						);
					}
				)();

				if (bufferResult.isErr()) {
					await Promise.resolve(onError(bufferResult.error));
					continue;
				}

				buffer += bufferResult.value;

				const messages = buffer.split('\n\n');
				buffer = messages.pop() || '';

				for (const message of messages) {
					if (!message.trim().startsWith('data: ')) continue;

					const rawData = message.replace('data: ', '').trim();

					let parsed: unknown;
					try {
						parsed = JSON.parse(rawData);
					} catch {
						parsed = rawData;
					}

					const safeParseResult = chunkSchema.safeParse(parsed);
					if (!safeParseResult.success) {
						await Promise.resolve(
							onError(
								new StreamError(
									`Failed to validate stream chunk: ${safeParseResult.error.message}`,
									false
								)
							)
						);
						continue;
					}

					// this will have type safety because of the types from the schema
					await Promise.resolve(onChunk(safeParseResult.data as any, index));
					index += 1;
					totalChunks += 1;
					totalBytes += value.length;
				}
			}
		}

		// END
		await handleFinish(false);
	};

	return {
		start: async (url: string) => {
			await Promise.resolve(onStart());
			internalRunStream(url);
		},
		stop: () => {
			controller.abort();
		}
	};
};

function createSseStream<Chunk>(data: { chunkSchema: z.ZodType<Chunk> }): SseStream<Chunk> {
	return {
		chunkSchema: data.chunkSchema,
		streamChunkType: 'sse'
	};
}

function createTextStream(): TextStream {
	return {
		chunkSchema: z.string(),
		streamChunkType: 'text'
	};
}

export { createSseStream, createTextStream, createStreamConsumer };
export type { SseStream, TextStream, Stream };
