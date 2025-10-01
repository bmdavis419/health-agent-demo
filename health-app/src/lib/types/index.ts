type TextStreamEntry = {
	id: string;
	content: string;
	completed: boolean;
};

type ReasoningStreamEntry = {
	id: string;
	content: string;
	completed: boolean;
};

type ToolCallStreamEntry = {
	id: string;
	name: string;
	inputObject?: Record<any, any>;
	input: string;
	outputObject?: Record<any, any>;
	output: string;
	status: 'building' | 'executing' | 'completed';
};

type StreamEntry =
	| {
			kind: 'text';
			data: TextStreamEntry;
	  }
	| {
			kind: 'tool';
			data: ToolCallStreamEntry;
	  }
	| {
			kind: 'break';
			data: null;
	  }
	| {
			kind: 'reasoning';
			data: ReasoningStreamEntry;
	  };

export type { StreamEntry };
