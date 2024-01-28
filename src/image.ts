import { TaskEither } from "fp-ts/TaskEither";
import * as te from "fp-ts/TaskEither";

export const genImage =
  (OPENAI_API_KEY: string) =>
  (prompt: string): TaskEither<any, any> =>
    te.tryCatch(
      async () => {
        console.log("gen image started with prompt", prompt);
        const response = await fetch(
          "https://api.openai.com/v1/images/generations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt,
              n: 1,
              size: "1024x1024",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        console.log(data);
        return data.data[0].url;
      },
      (err: any) => err
    );
