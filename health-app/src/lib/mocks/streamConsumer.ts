type MockStream<Chunk> = {
	__chunkType: Chunk;
	// all the other stuff u would need idk that's ur problem
};

type MockOnCompleteCallback = () => void;
type MockOnErrorCallback = (error: Error) => void;
type MockOnChunkCallback<Chunk> = (chunk: Chunk) => void;
type MockOnStartCallback = () => void;

type MockStreamConsumer<Chunk> = (
	stream: MockStream<Chunk>,
	streamId: string,
	args: {
		onComplete: OnCompleteCallback;
		onError: OnErrorCallback;
		onChunk: OnChunkCallback<Chunk>;
		onStart: OnStartCallback;
	}
) => void;
