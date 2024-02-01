import * as te from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { genImage } from './image';
import { ITwitterConfig, sendTweet } from './twitter';
import { ChatOpenAI, OpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { captions } from './captions';
import { fetchGoogleNewsHeadlines } from './news';
import { task } from 'fp-ts';

export interface Env {
	OPENAI_API_KEY: string;
	TWITTER_CONSUMER_KEY: string;
	TWITTER_CONSUMER_SECRET: string;
	TWITTER_ACCESS_TOKEN: string;
	TWITTER_TOKEN_SECRET: string;
	TWITTER_BEARER_TOKEN: string;
}

const works = [
	'The Gospels of the New Testament of the King James Bible',
	'The Book of Job',
	'The Book of Numbers',
	'The Book of Deuteronomy',
	'The Book of Revelations',
	'The Tibetan Book of the Dead',
	"Edward Gibbon's The History of the Decline and Fall of the Roman Empire Book 3 and 4",
	'The Poetic Edda',
	"Herodotus's The Histories",
	'Secret History of the Mongols',
	"Ovid's Metamorphoses",
	"Virgil's Aeneid",
	'The Epic of Gilgamesh',
	'The Mahabharata',
	"Sima Qian's Records of the Grand Historian",
	'Beowulf',
	"Homer's Odyssey",
	"Homer's Iliad",
];

enum Medium {
	Mosaic = 'mosaic',
	Fresco = 'fresco',
	Tapastry = 'tapestry',
	IlluminatedManuscript = 'illuminated manuscript',
	ReliefSculpture = 'relief sculpture',
	OilPainting = 'oil painting',
}

const buildArtPrompt =
	(medium: Medium) =>
	(prompt: string): string =>
		`A ${medium} of ${prompt}`;

const getArtPrompt =
	(openAIApiKey: string) =>
	(expertise: string): TaskEither<any, string> =>
		sendPrompt(openAIApiKey)(`You are a history expert who comes up with historic art prompt from a part of ${expertise}.
		The prompt should be able to fit in a tweet. Please include the year in parentheses at the end of the prompt.
		You respond with the prompt and the prompt only.
		Here are some examples. Your prompt should be similar to structure, content, and length as the following examples:

${captions.join('\n')}`)('Can you write me 1 prompt?');

const summarizeNews =
	(openAIApiKey: string) =>
	(news: string[]): TaskEither<any, string> =>
		sendPrompt(openAIApiKey)(
			`You are a news editor who is responsible for merging a list of headlines into a single paragraph summarizing what is currently happening in the world`
		)(news.join('\n'));

const modernizeArtPrompt =
	(openAIApiKey: string) =>
	(history: string) =>
	(news): TaskEither<any, string> =>
		sendPrompt(
			openAIApiKey
		)(`You are an artist that creates art that juxtaposes a moment in ancient history over a backdrop of a modern landscape composed of symbols, cultural references, memes, and pop culture.
		More specifically, you take the below paragraph which describes a historic moment along with a paragraph that summarizes current events provided by the end user.
		You then merge the two together to producing a paragraph describing the moment in ancient history but with modern embellishments.
		Ensure your cultural references are blatant, hyper modern, pop-art adjacent. Try to include a slice of pizza, bowl of buffalo wings, american football, guitars, sunglasses, expensive handbags, military grade weapons, or something hyper American:

${history}`)(news);

const sendPrompt =
	(openAIApiKey: string) =>
	(systemPrompt: string) =>
	(text: string): TaskEither<any, string> =>
		te.tryCatch(
			async () => {
				const humanTemplate = '{text}';

				const chatPrompt = ChatPromptTemplate.fromMessages([
					['system', systemPrompt],
					['human', humanTemplate],
				]);

				const chatModel: any = new ChatOpenAI({
					modelName: 'gpt-3.5-turbo',
					openAIApiKey,
				});

				const chain = chatPrompt.pipe(chatModel);
				const res: any = await chain.invoke({
					text,
				});

				console.log(res.content);

				return res.content;
			},
			(err: any) => {
				return err;
			}
		);

const randomMedium = (): Medium =>
	randomMember([Medium.Fresco, Medium.Mosaic, Medium.Tapastry, Medium.IlluminatedManuscript, Medium.ReliefSculpture]);

const randomMember = (list: string[]): any => {
	return list[Math.floor(Math.random() * list.length)];
};

export default {
	async fetch(event: any, env: Env, ctx): Promise<Response> {
		const OPENAI_API_KEY: any = env.OPENAI_API_KEY;
		const consumerKey: any = env.TWITTER_CONSUMER_KEY;
		const consumerSecret: any = env.TWITTER_CONSUMER_SECRET;
		const accessToken: any = env.TWITTER_ACCESS_TOKEN;
		const tokenSecret: any = env.TWITTER_TOKEN_SECRET;
		const twitterBearerToken: any = env.TWITTER_BEARER_TOKEN;

		// if (request.method !== 'POST') throw new Error('Method not allowed');

		const twitter: ITwitterConfig = {
			consumerKey,
			consumerSecret,
			accessToken,
			tokenSecret,
		};

		// const res = await fetchGoogleNewsHeadlines()();

		return await pipe(
			te.of(randomMember(works)),
			te.chain(getArtPrompt(OPENAI_API_KEY)),
			// te.chain(factChecker(OPENAI_API_KEY)(expertise)),
			te.chain((caption: string) =>
				pipe(
					fetchGoogleNewsHeadlines(),
					te.chain(summarizeNews(OPENAI_API_KEY)),
					te.chain(modernizeArtPrompt(OPENAI_API_KEY)(caption)),
					te.map(buildArtPrompt(randomMedium())),
					te.chain(genImage(OPENAI_API_KEY)),
					te.chain(sendTweet(twitter)(caption))
				)
			),
			te.fold(
				(err) => {
					console.log(err);
					console.log(err.message);

					return task.of(new Response('Tweet Sent!', { status: 500 }));
				},
				(val) => task.of(new Response('Tweet Sent!'))
			)
		)();
	},
};
