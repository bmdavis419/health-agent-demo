type OnCompleteCallback = () => void;
type OnErrorCallback = (error: Error) => void;
type OnChunkCallback<Chunk> = (chunk: Chunk) => void;
type OnStartCallback = () => void;

type MockStreamConsumer<Chunk> = (
	streamId: string,
	args: {
		onComplete: OnCompleteCallback;
		onError: OnErrorCallback;
		onChunk: OnChunkCallback<Chunk>;
		onStart: OnStartCallback;
	}
) => void;
