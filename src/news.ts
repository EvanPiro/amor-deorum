import * as te from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { parseStringPromise } from 'xml2js';

export const fetchGoogleNewsHeadlines = (): TaskEither<string, string[]> =>
	te.tryCatch(
		async () => {
			const url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'; // Google News RSS feed URL
			const response = await fetch(url);
			const body = await response.text();

			// Parse XML to JSON
			const result = await parseStringPromise(body);
			const items = result.rss.channel[0].item;

			// Reduce to a list of headlines
			const headlines = items.map((item: any) => item.title[0]);

			return headlines;
		},
		(error) => {
			console.error('Failed to fetch Google News headlines:', error);
			return `Error: ${error.message}`;
		}
	);
