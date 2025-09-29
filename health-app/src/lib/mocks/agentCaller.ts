// agentId should be a real object so that the types can be inferred
// through generics
type MockAgentCaller<I, O> = (agentId: string, input: I) => Promise<O>;
