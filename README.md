# n8n-nodes-opencode

This is an n8n community node that integrates [OpenCode](https://opencode.ai/) as a chat model for use with n8n's AI Agent and LangChain workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[OpenCode](https://opencode.ai/) is an open-source AI coding agent built for the terminal with support for multiple LLM providers.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Option 1: npm

```bash
npm install n8n-nodes-opencode
```

### Option 2: Manual Installation

1. Clone this repository
2. Run `npm install` and `npm run build`
3. Copy the `dist` folder to `~/.n8n/custom/` (create if it doesn't exist)
4. Restart n8n

## Prerequisites

- n8n version 1.0.0 or later
- OpenCode server running (see [OpenCode documentation](https://opencode.ai/docs/))

## OpenCode Server Setup

### Local Development

```bash
# Install OpenCode CLI
npm install -g @opencode-ai/cli

# Start the server
opencode serve
```

By default, OpenCode server runs on `http://localhost:4096`.

## Credentials

This node requires OpenCode API credentials:

1. In n8n, go to **Credentials** → **New**
2. Search for "OpenCode API"
3. Configure:
   - **Base URL**: Your OpenCode server URL (default: `http://localhost:4096`)
   - **API Key**: (Optional) If your OpenCode instance requires authentication

## Usage

1. Add the **OpenCode Chat Model** node to your workflow
2. Select or create OpenCode API credentials
3. Configure the model:
   - **Agent**: Choose the OpenCode agent type (`build`, `chat`, `debug`)
   - **Model Provider**: Select provider (Anthropic, OpenAI, Google, Groq, Ollama)
   - **Model ID**: Specify the model (e.g., `claude-3-5-sonnet-20241022`)
4. Connect to an **AI Agent** node or other LangChain-compatible nodes

### Example Workflow

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Chat Trigger   │────→│   AI Agent       │────→│  Respond       │
└─────────────────┘     └──────────────────┘     └────────────────┘
                               │
                               ↓
                        ┌──────────────────┐
                        │ OpenCode Chat    │
                        │     Model        │
                        └──────────────────┘
```

## Supported Models

The node supports models from these providers (via [models.dev](https://models.dev)):

### Anthropic

- `claude-sonnet-4-5-20250929` (latest)
- `claude-sonnet-4-20250514`
- `claude-3-7-sonnet-20250219`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-sonnet-20240620`
- `claude-opus-4-1-20250805`
- `claude-opus-4-20250514`
- `claude-haiku-4-5-20251001`
- `claude-3-5-haiku-20241022`

### OpenAI

- `gpt-5` (latest)
- `gpt-5-mini`
- `gpt-5-nano`
- `o3`
- `o3-mini`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4o`
- `gpt-4o-mini`
- `o1`
- `o1-mini`
- `gpt-4-turbo`

### Google

- `gemini-2.5-pro` (latest)
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.5-flash-8b`

### Groq

- `llama-3.3-70b-versatile`
- `llama3-70b-8192`
- `llama-3.1-8b-instant`
- `qwen-qwq-32b`
- `mistral-saba-24b`
- `gemma2-9b-it`

### Mistral

- `mistral-large-latest`
- `mistral-medium-latest`
- `mistral-small-latest`
- `pixtral-large-latest`
- `codestral-latest`
- `ministral-8b-latest`
- `ministral-3b-latest`

### Meta (Llama)

- `llama-4-maverick-17b`
- `llama-4-scout-17b`
- `llama-3.3-70b-instruct`
- `llama-3.2-1b-instruct`
- `llama-3.1-70b-instruct`
- `llama-3.1-8b-instruct`

### DeepSeek

- `deepseek-chat`
- `deepseek-reasoner`

### Alibaba (Qwen)

- `qwen3-max`
- `qwen3-32b`
- `qwen3-14b`
- `qwen3-8b`
- `qwen-max`
- `qwen-plus`

### Moonshot AI (Kimi)

- `kimi-k2-0905-preview`
- `kimi-k2-0711-preview`

### Ollama (Self-hosted)

- Any model available in your Ollama instance
- Examples: `qwen2.5-coder:32b`, `codellama:34b`, `llama3:70b`

## Configuration Options

### Agent Types

- **Build**: Optimized for implementing features and writing code
- **Chat**: General-purpose conversational agent
- **Debug**: Specialized for debugging and troubleshooting

### Model Parameters

- **Temperature**: Control randomness (0-2, default: 0.7)
- **Maximum Tokens**: Limit response length (-1 for unlimited)

## Features

- ✅ Full LangChain integration
- ✅ Multiple model providers (Anthropic, OpenAI, Google, Groq, Ollama)
- ✅ Session management with automatic cleanup
- ✅ Tool calling support (via OpenCode's native capabilities)
- ✅ Comprehensive error handling and validation
- ✅ TypeScript support with full type definitions

## Troubleshooting

### Connection Issues

**Problem**: "Failed to create OpenCode session"
**Solution**: Verify OpenCode server is running and accessible at the configured base URL.

```bash
# Test connection
curl http://localhost:4096/app
```

### Authentication Issues

**Problem**: "Unauthorized" errors
**Solution**: If your OpenCode server requires authentication, ensure the API key is correctly configured in credentials.

### Model Not Available

**Problem**: Model ID not recognized
**Solution**: Ensure the specified model is configured in your OpenCode server and the corresponding provider API keys are set.

## Development

### Build

```bash
npm install
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Lint

```bash
npm run lint
npm run lintfix
```

## Architecture

This node implements a custom LangChain `BaseChatModel` that:

1. **Session Management**: Creates and manages OpenCode sessions via REST API
2. **Message Handling**: Converts LangChain messages to OpenCode prompt format
3. **Streaming**: Implements Server-Sent Events (SSE) for real-time responses
4. **Event Parsing**: Processes `message.part.updated` and `session.updated` events

### Key Components

- `OpenCodeChatModel.ts`: Custom LangChain chat model implementation
- `LmChatOpenCode.node.ts`: n8n node wrapper
- `OpenCodeApi.credentials.ts`: Credentials definition

## API Endpoints Used

- `POST /session`: Create new session
- `POST /session/:id/prompt`: Send prompt with message parts
- `GET /event`: Server-Sent Events stream for responses
- `DELETE /session/:id`: Clean up session

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[MIT](LICENSE)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode GitHub](https://github.com/sst/opencode)
- [LangChain Documentation](https://js.langchain.com/)

## Support

For issues and questions:

- [GitHub Issues](https://github.com/ssccio/n8n-nodes-opencode/issues)
- [n8n Community Forum](https://community.n8n.io/)
- [OpenCode Discord](https://discord.gg/opencode)
