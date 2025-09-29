type Stream<Chunk> = {
	__chunkType: Chunk;
	// all the other stuff u would need idk that's ur problem
};

type OnCompleteCallback = () => void;
type OnErrorCallback = (error: Error) => void;
type OnChunkCallback<Chunk> = (chunk: Chunk) => void;
type OnStartCallback = () => void;

type MockStreamConsumer<Chunk> = (
	stream: Stream<Chunk>,
	streamId: string,
	args: {
		onComplete: OnCompleteCallback;
		onError: OnErrorCallback;
		onChunk: OnChunkCallback<Chunk>;
		onStart: OnStartCallback;
	}
) => void;
