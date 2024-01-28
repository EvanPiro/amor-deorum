import * as te from "fp-ts/TaskEither";
import { TaskEither } from "fp-ts/TaskEither";
import { config } from "dotenv";
import { pipe } from "fp-ts/function";
import { genImage } from "./image";
import { ITwitterConfig, sendTweet } from "./twitter";
import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { captions } from "./captions";

config();

const OPENAI_API_KEY: any = process.env.OPENAI_API_KEY;

const consumerKey: any = process.env.TWITTER_CONSUMER_KEY;
const consumerSecret: any = process.env.TWITTER_CONSUMER_SECRET;
const accessToken: any = process.env.TWITTER_ACCESS_TOKEN;
const tokenSecret: any = process.env.TWITTER_TOKEN_SECRET;

const twitter: ITwitterConfig = {
  consumerKey,
  consumerSecret,
  accessToken,
  tokenSecret,
};

const works = [
  "The New Testament of the King James Bible",
  "The Old Testament of the King James Bible",
  "Edward Gibbon's The History of the Decline and Fall of the Roman Empire",
  "The Poetic Edda",
  "Herodotus's The Histories",
  "The Epic of Gilgamesh",
  "The Mahabharata",
  "Sima Qian's Records of the Grand Historian",
  "Beowulf",
  "Homer's Odyssey",
  "Homer's Iliad",
];

enum Medium {
  ReliefSculpture = "relief sculpture",
  Mosaic = "mosaic",
  Fresco = "fresco",
}

const buildArtPrompt =
  (medium: Medium) =>
  (prompt: string): string =>
    `A roman ${medium} of ${prompt}`;

const getPrompt =
  (openAIApiKey: string) =>
  (expertise: string): TaskEither<any, string> =>
    te.tryCatch(
      async () => {
        const template = `You are a history expert who comes up with historic art prompt from a part of ${expertise}. The prompt should be able to fit in a tweet. Here are some examples. Your prompt should be similar to structure, content, and length as the following examples:

${captions.join("\n")}`;

        const humanTemplate = "{text}";

        const chatPrompt = ChatPromptTemplate.fromMessages([
          ["system", template],
          ["human", humanTemplate],
        ]);

        const chatModel = new ChatOpenAI({
          modelName: "gpt-3.5-turbo",
          openAIApiKey,
        });

        const chain = chatPrompt.pipe(chatModel);
        const res: any = await chain.invoke({
          text: "Can you write me 1 prompt?",
        });

        return res.content;
      },
      (err: any) => {
        return err;
      }
    );

const randomCaption = (): string => randomMember(captions);

const randomMedium = (): Medium =>
  randomMember([Medium.ReliefSculpture, Medium.Fresco, Medium.Mosaic]);

const randomMember = (list: string[]): any => {
  return list[Math.floor(Math.random() * list.length)];
};

export const run = async () =>
  await pipe(
    te.of(randomMember(works)),
    te.chain(getPrompt(OPENAI_API_KEY)),
    // te.chain(factChecker(OPENAI_API_KEY)(expertise)),
    te.chain((caption: string) =>
      pipe(
        te.of(buildArtPrompt(randomMedium())(caption)),
        te.chain(genImage(OPENAI_API_KEY)),
        te.chain(sendTweet(twitter)(caption))
      )
    )
  )();

run();
