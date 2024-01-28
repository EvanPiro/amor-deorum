import * as te from 'fp-ts/TaskEither';
import axios from 'axios';
import addOAuthInterceptor, { OAuthInterceptorConfig } from 'axios-oauth-1.0a';
import { TaskEither } from 'fp-ts/TaskEither';
import OAuth from 'oauth-1.0a';
import * as crypto from 'crypto-js';
import FormData from 'form-data';

export interface ITwitterConfig {
	consumerKey: string;
	consumerSecret: string;
	accessToken: string;
	tokenSecret: string;
}

export const twitterAxiosClient = (twitter: ITwitterConfig) => {
	const client = axios.create();

	const options: OAuthInterceptorConfig = {
		key: twitter.consumerKey,
		secret: twitter.consumerSecret,
		token: twitter.accessToken,
		tokenSecret: twitter.tokenSecret,
		algorithm: 'HMAC-SHA1',
	};

	addOAuthInterceptor(client, options);

	return client;
};

const generateOAuthSignature = (twitter: ITwitterConfig, method: string, url: string, data: any = {}) => {
	const oauth = new OAuth({
		consumer: {
			key: twitter.consumerKey,
			secret: twitter.consumerSecret,
		},
		signature_method: 'HMAC-SHA1',
		hash_function(baseString, key) {
			return crypto.HmacSHA1(baseString, key).toString(crypto.enc.Base64);
		},
	});

	const requestData = {
		url: url,
		method: method,
		data: data,
	};

	return oauth.toHeader(
		oauth.authorize(requestData, {
			key: twitter.accessToken,
			secret: twitter.tokenSecret,
		})
	);
};

export const twitterFetchClient = async (twitter: ITwitterConfig, url: string, method: string = 'GET', body?: any) => {
	const oauthHeader = generateOAuthSignature(twitter, method, url, body);

	const headers = new Headers({
		Authorization: oauthHeader['Authorization'],
		'Content-Type': 'application/x-www-form-urlencoded',
	});

	const response = await fetch(url, {
		method: method,
		headers: headers,
		body: method === 'GET' ? null : JSON.stringify(body),
	});

	return response.json();
};

export const sendTweet =
	(twitter: ITwitterConfig) =>
	(text: string) =>
	(imageUrl: string): TaskEither<string, any> =>
		te.tryCatch(
			async () => {
				console.log('sending tweet', text, imageUrl);

				// Fetch the image
				const imageResponse = await fetch(imageUrl);
				const imageBlob = await imageResponse.blob();

				// OAuth signature for media upload
				const mediaUploadHeader = generateOAuthSignature(twitter, 'POST', 'https://upload.twitter.com/1.1/media/upload.json');

				const form = new FormData();

				form.append('media', imageBlob); // Append the blob directly

				// Upload media to Twitter
				let mediaUploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
					method: 'POST',
					headers: new Headers({
						...mediaUploadHeader,
					}),
					body: form,
				});

				const mediaUploadData = await mediaUploadResponse.json();
				console.log('mediaUploadData', mediaUploadData);
				const media_id_string = mediaUploadData.media_id_string;

				// OAuth signature for tweeting
				const tweetHeader = generateOAuthSignature(twitter, 'POST', 'https://api.twitter.com/2/tweets');

				// Post the tweet
				const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
					method: 'POST',
					headers: new Headers({
						Authorization: tweetHeader['Authorization'],
						'Content-Type': 'application/json',
					}),
					body: JSON.stringify({
						text,
						media: {
							media_ids: [media_id_string],
						},
					}),
				});

				const tweetData = await tweetResponse.json();

				console.log('tweet sent', tweetData);

				return tweetData;
			},
			(err: any) => {
				console.error(err);
				return 'tweet send failed';
			}
		);
