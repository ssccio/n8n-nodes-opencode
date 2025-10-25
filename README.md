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

### Kubernetes Deployment

For production use in Kubernetes (where n8n is hosted):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opencode
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opencode
  template:
    metadata:
      labels:
        app: opencode
    spec:
      containers:
        - name: opencode
          image: opencode/opencode:latest
          args: ["serve"]
          ports:
            - containerPort: 4096
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: opencode-secrets
                  key: anthropic-api-key
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: opencode-secrets
                  key: openai-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: opencode-service
spec:
  selector:
    app: opencode
  ports:
    - port: 4096
      targetPort: 4096
```

Then configure the n8n node to use `http://opencode-service.default.svc.cluster.local:4096` as the base URL.

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

The node supports models from these providers:

### Anthropic

- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`

### OpenAI

- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

### Google

- `gemini-2.0-flash-exp`
- `gemini-pro`

### Groq

- `llama-3.3-70b-versatile`
- `mixtral-8x7b-32768`

### Ollama (Self-hosted)

- `qwen2.5-coder:32b`
- `codellama:34b`
- Any model available in your Ollama instance

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
- ✅ Streaming responses
- ✅ Multiple model providers
- ✅ Session management
- ✅ Kubernetes-ready
- ✅ Tool calling support (via OpenCode's native capabilities)
- ✅ File attachment support (for code analysis)

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
