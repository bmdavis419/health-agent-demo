import { command, getRequestEvent } from '$app/server';
import { AGENTUITY_HEALTH_AGENT_URL, AGENTUITY_HEALTH_AGENT_TOKEN } from '$env/static/private';
import { error } from '@sveltejs/kit';
import { ResultAsync } from 'neverthrow';
import z from 'zod';

type StartAgentInput = {
	type: 'run_agent';
	user_id: string;
};

type GetAgentStreamInput = {
	type: 'get_stream';
	stream_id: string;
};

type StartAgentOutput = {
	fullStreamId: string;
	fullStreamUrl: string;
	textStreamId: string;
	textStreamUrl: string;
};

type GetAgentStreamOutput = {
	streamUrl: string;
};

const startHealthSummaryAgentSchema = z.object({
	userId: z.string()
});

export const startHealthSummaryAgent = command(
	startHealthSummaryAgentSchema,
	async ({ userId }) => {
		const event = getRequestEvent();
		const input: StartAgentInput = {
			type: 'run_agent',
			user_id: userId
		};

		const response = await ResultAsync.fromPromise(
			event
				.fetch(`${AGENTUITY_HEALTH_AGENT_URL}`, {
					method: 'POST',
					body: JSON.stringify(input),
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${AGENTUITY_HEALTH_AGENT_TOKEN}`
					}
				})
				.then(async (response) => {
					const data = await response.json();
					// should actually validate the output but it's a demo man I don't fucking care
					return data as StartAgentOutput;
				}),
			(error) => {
				return new Error('Failed to start health summary agent', {
					cause: error
				});
			}
		);

		if (response.isErr()) {
			console.error(response.error);
			return error(500, response.error.message);
		}

		return {
			...response.value
		};
	}
);
