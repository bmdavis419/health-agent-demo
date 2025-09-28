import { getContext, setContext } from 'svelte';
import { createHighlighter, type HighlighterGeneric } from 'shiki';
import { Result } from 'neverthrow';

type Highlighter = HighlighterGeneric<'json', 'github-dark-default'>;

class ShikiStore {
	private highlighter = $state<Highlighter | null>(null);
	highlighterIsReady = $derived(this.highlighter !== null);

	constructor() {
		$effect(() => {
			createHighlighter({
				themes: ['github-dark-default'],
				langs: ['json']
			}).then((highlighter) => {
				this.highlighter = highlighter;
			});
			return () => {
				if (this.highlighter) {
					this.highlighter.dispose();
				}
			};
		});
	}
	private safeFormatJson = (obj: Record<any, any>) =>
		Result.fromThrowable(
			() => JSON.stringify(obj, null, 2),
			(error) => new Error(`Failed to stringify object: ${error}`)
		)();

	private safeHighlightJson = (str: string) =>
		Result.fromThrowable(
			() =>
				this.highlighter
					? this.highlighter.codeToHtml(str, {
							lang: 'json',
							theme: 'github-dark-default',
							colorReplacements: {
								'#0d1117': '#1B1B1B'
							}
						})
					: str,
			(error) => new Error(`Failed to highlight json: ${error}`)
		)();

	highlightJsonIfPossible = (obj: Record<any, any>) => {
		const result = this.safeFormatJson(obj).andThen((str) => this.safeHighlightJson(str));

		if (result.isOk()) {
			return result.value;
		}

		return 'the model sent invalid json...';
	};
}

const DEFAULT_SHIKI_STORE_KEY = '$_shiki_store';

export const setShikiStore = (key: string = DEFAULT_SHIKI_STORE_KEY) => {
	const store = new ShikiStore();
	return setContext(key, store);
};

export const getShikiStore = (key: string = DEFAULT_SHIKI_STORE_KEY) => {
	const store = getContext<ShikiStore>(key);
	if (!store) {
		throw new Error(
			`ShikiStore not found for key: ${key}. Make sure to call setShikiStore() first.`
		);
	}
	return store;
};
