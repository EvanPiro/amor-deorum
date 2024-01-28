import * as te from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { genImage } from './image';
import { ITwitterConfig, sendTweet } from './twitter';
import { ChatOpenAI, OpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { captions } from './captions';

export interface Env {
	OPENAI_API_KEY: string;
	TWITTER_CONSUMER_KEY: string;
	TWITTER_CONSUMER_SECRET: string;
	TWITTER_ACCESS_TOKEN: string;
	TWITTER_TOKEN_SECRET: string;
}

const works = [
	'The Gospels of the New Testament of the King James Bible',
	'The Old Testament of the King James Bible',
	"Edward Gibbon's The History of the Decline and Fall of the Roman Empire",
	'The Poetic Edda',
	"Herodotus's The Histories",
	'The Epic of Gilgamesh',
	'The Mahabharata',
	"Sima Qian's Records of the Grand Historian",
	'Beowulf',
	"Homer's Odyssey",
	"Homer's Iliad",
];

enum Medium {
	ReliefSculpture = 'relief sculpture',
	Mosaic = 'mosaic',
	Fresco = 'fresco',
	Sculpture = 'sculpture',
	Tapastry = 'tapestry',
	IlluminatedManuscript = 'illuminated manuscript',
}

const buildArtPrompt =
	(medium: Medium) =>
	(prompt: string): string =>
		`A ${medium} of ${prompt}`;

const getPrompt =
	(openAIApiKey: string) =>
	(expertise: string): TaskEither<any, string> =>
		te.tryCatch(
			async () => {
				const template = `You are a history expert who comes up with historic art prompt from a part of ${expertise}. The prompt should be able to fit in a tweet. Here are some examples. Your prompt should be similar to structure, content, and length as the following examples:

${captions.join('\n')}`;

				const humanTemplate = '{text}';

				const chatPrompt = ChatPromptTemplate.fromMessages([
					['system', template],
					['human', humanTemplate],
				]);

				const chatModel: any = new ChatOpenAI({
					modelName: 'gpt-3.5-turbo',
					openAIApiKey,
				});

				const chain = chatPrompt.pipe(chatModel);
				const res: any = await chain.invoke({
					text: 'Can you write me 1 prompt?',
				});

				return res.content;
			},
			(err: any) => {
				return err;
			}
		);

const randomMedium = (): Medium =>
	randomMember([Medium.ReliefSculpture, Medium.Fresco, Medium.Mosaic, Medium.Sculpture, Medium.Tapastry, Medium.IlluminatedManuscript]);

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

		// if (request.method !== 'POST') throw new Error('Method not allowed');

		const twitter: ITwitterConfig = {
			consumerKey,
			consumerSecret,
			accessToken,
			tokenSecret,
		};

		await pipe(
			te.of(randomMember(works)),
			te.chain(getPrompt(OPENAI_API_KEY)),
			// te.chain(factChecker(OPENAI_API_KEY)(expertise)),
			te.chain((caption: string) =>
				pipe(te.of(buildArtPrompt(randomMedium())(caption)), te.chain(genImage(OPENAI_API_KEY)), te.chain(sendTweet(twitter)(caption)))
			)
		)();

		return new Response('Tweet Sent!');
	},
};
