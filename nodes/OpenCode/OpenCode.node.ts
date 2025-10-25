import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class OpenCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenCode',
		name: 'openCode',
		icon: 'file:opencode.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use OpenCode as an AI chat model',
		defaults: {
			name: 'OpenCode',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'openCodeApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
				],
				default: 'chat',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['chat'],
					},
				},
				options: [
					{
						name: 'Complete',
						value: 'complete',
						description: 'Create a chat completion',
						action: 'Create a chat completion',
					},
				],
				default: 'complete',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['chat'],
						operation: ['complete'],
					},
				},
				default: 'gpt-4',
				required: true,
				description: 'The model to use for completion',
			},
			{
				displayName: 'Messages',
				name: 'messages',
				placeholder: 'Add Message',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['chat'],
						operation: ['complete'],
					},
				},
				default: {},
				options: [
					{
						name: 'messageValues',
						displayName: 'Message',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{
										name: 'System',
										value: 'system',
									},
									{
										name: 'User',
										value: 'user',
									},
									{
										name: 'Assistant',
										value: 'assistant',
									},
								],
								default: 'user',
								description: 'The role of the message author',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								typeOptions: {
									rows: 4,
								},
								default: '',
								description: 'The content of the message',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						resource: ['chat'],
						operation: ['complete'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 1,
						description: 'Sampling temperature between 0 and 2. Higher values make output more random.',
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1000,
						description: 'The maximum number of tokens to generate',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 1,
						description: 'Nucleus sampling parameter',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequency_penalty',
						type: 'number',
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 0,
						description: 'Penalty for repeating tokens',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presence_penalty',
						type: 'number',
						typeOptions: {
							minValue: -2,
							maxValue: 2,
							numberPrecision: 1,
						},
						default: 0,
						description: 'Penalty for using tokens that appear in the text',
					},
					{
						displayName: 'Stream',
						name: 'stream',
						type: 'boolean',
						default: false,
						description: 'Whether to stream back partial progress',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'chat') {
					if (operation === 'complete') {
						const model = this.getNodeParameter('model', i) as string;
						const messagesData = this.getNodeParameter('messages', i, {}) as {
							messageValues?: Array<{ role: string; content: string }>;
						};
						const options = this.getNodeParameter('options', i, {}) as {
							temperature?: number;
							max_tokens?: number;
							top_p?: number;
							frequency_penalty?: number;
							presence_penalty?: number;
							stream?: boolean;
						};

						// Extract messages from the fixed collection format
						const messages = messagesData.messageValues || [];

						const body: any = {
							model,
							messages,
							...options,
						};

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'openCodeApi',
							{
								method: 'POST',
								url: '/chat/completions',
								body,
							},
						);

						returnData.push({
							json: response,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					returnData.push({
						json: {
							error: errorMessage,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
