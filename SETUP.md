# Quick Setup Guide

## Project Structure

```
opencode-chat-model/
├── credentials/
│   └── OpenCodeApi.credentials.ts    # n8n credentials definition
├── nodes/
│   └── LmChatOpenCode/
│       ├── LmChatOpenCode.node.ts    # n8n node wrapper
│       ├── OpenCodeChatModel.ts      # Custom LangChain chat model
│       └── opencode.svg              # Node icon
├── package.json                       # Package configuration
├── tsconfig.json                      # TypeScript configuration
├── README.md                          # Full documentation
├── LICENSE                            # MIT License
└── .gitignore                         # Git ignore rules
```

## Build and Install

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Node

```bash
npm run build
```

This will:

- Compile TypeScript to JavaScript
- Copy the icon to the dist folder
- Generate type definitions

### 3. Install in n8n

#### Option A: Local Development (Manual Copy)

```bash
# Copy to n8n custom nodes directory
mkdir -p ~/.n8n/custom
cp -r dist ~/.n8n/custom/n8n-nodes-opencode
```

#### Option B: Link for Development

```bash
# From this directory
npm link

# In your n8n directory
cd ~/.n8n
npm link n8n-nodes-opencode
```

#### Option C: Publish to npm

```bash
# Update package.json with your details first
npm publish
```

Then in n8n: **Settings** → **Community Nodes** → Install `n8n-nodes-opencode`

### 4. Restart n8n

```bash
# If running via npm
n8n start

# If running via Docker
docker restart n8n
```

## Configure OpenCode Server

### Local Development

```bash
# Install OpenCode
npm install -g @opencode-ai/cli

# Set up API keys
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here

# Start server
opencode serve
```

### Kubernetes Deployment

See `README.md` for Kubernetes deployment YAML.

## Test the Node

### 1. Create Credentials

In n8n:

1. Go to **Credentials** → **New**
2. Search for "OpenCode API"
3. Enter:
   - Base URL: `http://localhost:4096` (or your Kubernetes service URL)
   - API Key: (leave empty if not required)
4. Click **Test** to verify connection
5. Save

### 2. Create Test Workflow

1. Add **Chat Trigger** node
2. Add **AI Agent** node
3. Add **OpenCode Chat Model** node:
   - Connect to AI Agent
   - Select credentials
   - Choose Agent: `build`
   - Provider: `anthropic`
   - Model ID: `claude-3-5-sonnet-20241022`
4. Connect AI Agent → Chat Trigger response

### 3. Test Conversation

Start the workflow and send a message through the chat interface:

- "Write a Python function to calculate fibonacci numbers"
- "Explain how async/await works in JavaScript"
- "Debug this error: TypeError: Cannot read property 'length' of undefined"

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Node Not Appearing

1. Check n8n logs for errors
2. Verify the build completed successfully
3. Ensure `dist/nodes/LmChatOpenCode/LmChatOpenCode.node.js` exists
4. Restart n8n completely

### Connection Errors

```bash
# Test OpenCode server directly
curl http://localhost:4096/app

# Should return app info
```

### Authentication Errors

If using API key authentication:

1. Verify the key in OpenCode server configuration
2. Update credentials in n8n
3. Test credentials again

## Development Workflow

### Watch Mode for Development

```bash
# Terminal 1: Watch TypeScript compilation
npm run dev

# Terminal 2: Run n8n in development mode
n8n start
```

Changes to `.ts` files will automatically recompile. Restart n8n to pick up changes.

### Testing Changes

1. Make code changes
2. Save files (watch mode compiles automatically)
3. Restart n8n
4. Test in n8n UI

## Next Steps

- **Customize**: Modify `OpenCodeChatModel.ts` to add features
- **Extend**: Add support for file attachments or tool calling
- **Deploy**: Push to Kubernetes alongside n8n
- **Share**: Publish to npm for community use

## Common Customizations

### Add More Model Options

Edit `nodes/LmChatOpenCode/LmChatOpenCode.node.ts`:

```typescript
{
  displayName: 'Model ID',
  name: 'modelID',
  type: 'options', // Change from 'string' to 'options'
  options: [
    { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    // Add more...
  ],
}
```

### Add Custom Agent Types

Add to the agent dropdown in the same file.

### Modify Session Behavior

Edit `OpenCodeChatModel.ts` to change how sessions are created/reused.

## Resources

- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [LangChain BaseChatModel](https://js.langchain.com/docs/modules/model_io/models/chat/)

## Support

- GitHub Issues: Report bugs and request features
- n8n Community: Get help from the community
- OpenCode Discord: Ask OpenCode-specific questions
