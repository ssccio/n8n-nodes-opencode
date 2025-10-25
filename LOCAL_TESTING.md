# Local Testing Guide

Complete guide to test the OpenCode n8n node locally with both `n8n` and `opencode serve` running.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- An API key for Anthropic, OpenAI, or another model provider

## Step 1: Start OpenCode Server

### Install OpenCode

```bash
# Install OpenCode CLI globally
npm install -g @opencode-ai/cli

# Or use npx (no installation needed)
npx @opencode-ai/cli serve
```

### Configure API Keys

OpenCode needs API keys for the model providers you want to use:

```bash
# Set environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

Or create a `.env` file in your home directory:

```bash
# ~/.opencode/.env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### Start the Server

```bash
# Start OpenCode server on default port 4096
opencode serve

# Or specify a different port
opencode serve --port 4096

# Or with specific hostname
opencode serve --hostname 127.0.0.1 --port 4096
```

You should see output like:

```
✓ OpenCode server running at http://localhost:4096
```

### Verify OpenCode is Running

```bash
# Test the server
curl http://localhost:4096/app

# Should return something like:
# {"name":"opencode","version":"..."}
```

## Step 2: Build the n8n Node

In the `opencode-chat-model` directory:

```bash
# Install dependencies
npm install

# Build the node
npm run build
```

This creates the `dist/` folder with compiled JavaScript.

## Step 3: Install Node in n8n

### Option A: Using n8n's Custom Nodes Directory

```bash
# Create n8n custom directory if it doesn't exist
mkdir -p ~/.n8n/custom

# Copy the built node
cp -r dist ~/.n8n/custom/n8n-nodes-opencode
cp -r credentials ~/.n8n/custom/n8n-nodes-opencode/

# Copy package.json
cp package.json ~/.n8n/custom/n8n-nodes-opencode/
```

### Option B: Using npm link (for development)

```bash
# In the opencode-chat-model directory
npm link

# Then n8n will pick it up automatically
```

## Step 4: Start n8n

### Install n8n (if not already installed)

```bash
npm install -g n8n
```

### Start n8n

```bash
# Start n8n
n8n start

# Or if you want to see more logs
N8N_LOG_LEVEL=debug n8n start
```

n8n will start on `http://localhost:5678`

## Step 5: Configure OpenCode Credentials in n8n

1. Open n8n in your browser: `http://localhost:5678`

2. Go to **Credentials** (click your user icon → Credentials)

3. Click **Add Credential**

4. Search for "OpenCode API"

5. Fill in the credentials:

   - **Name**: `OpenCode Local` (or any name you prefer)
   - **Base URL**: `http://localhost:4096`
   - **API Key**: Leave empty (unless your OpenCode instance requires it)

6. Click **Test** to verify the connection

   - You should see "✓ Connection successful"

7. Click **Save**

## Step 6: Create a Test Workflow

### Simple Test Workflow

1. Click **Add workflow** (+ button)

2. Add these nodes in order:

   **Node 1: Manual Trigger**

   - Search for "Manual Trigger" (or it might be added by default)

   **Node 2: OpenCode Chat Model**

   - Search for "OpenCode Chat Model"
   - Connect to the workflow
   - Configure:
     - **Credentials**: Select "OpenCode Local" (created in Step 5)
     - **Agent**: `build`
     - **Model Provider**: `anthropic`
     - **Model ID**: `claude-3-5-sonnet-20241022`
     - **Temperature**: `0.7`

   **Node 3: AI Agent**

   - Search for "AI Agent"
   - Add to workflow
   - Configure:
     - **Prompt Type**: `Define below`
     - **Text**: `You are a helpful coding assistant`
   - Connect the **OpenCode Chat Model** to the AI Agent's chat model input

   **Node 4: Set**

   - Add a "Set" node
   - Configure to set a variable with your prompt:
     - **Mode**: `Manual`
     - **Fields**:
       - Name: `prompt`
       - Value: `Write a Python function to calculate fibonacci numbers`

3. Connect the nodes:

   ```
   Manual Trigger → Set → AI Agent
                            ↓ (model input)
                      OpenCode Chat Model
   ```

### Advanced Test: Chat Interface

1. Create a new workflow

2. Add these nodes:

   **Node 1: Chat Trigger**

   - Search for "Chat Trigger"
   - This creates an interactive chat interface

   **Node 2: AI Agent**

   - Configure prompt: `You are a helpful AI coding assistant specialized in software development.`

   **Node 3: OpenCode Chat Model**

   - Connect to AI Agent (chat model input)
   - Configure same as above

3. Save and **activate** the workflow

4. Click **Test workflow** → **Open chat**

5. Try these prompts:
   - "Write a Python function to reverse a string"
   - "Explain how promises work in JavaScript"
   - "Debug this code: [paste some code with an error]"

## Step 7: Test the Integration

### Test 1: Simple Execution

With the simple workflow:

1. Click **Execute Workflow** (play button)
2. Check the output from the AI Agent node
3. You should see the generated code for fibonacci

### Test 2: Streaming Test

With the chat interface workflow:

1. Send a message: "Write a sorting algorithm in Python"
2. You should see the response streaming in real-time
3. The tokens should appear progressively (not all at once)

### Test 3: Different Providers

Change the model provider in the OpenCode Chat Model node:

```
Provider: openai
Model ID: gpt-4-turbo
```

Or:

```
Provider: ollama
Model ID: qwen2.5-coder:32b
```

(Requires Ollama running locally with the model pulled)

## Troubleshooting

### Issue: "Node not found"

**Solution**: Restart n8n completely

```bash
# Kill n8n
pkill -f n8n

# Start again
n8n start
```

### Issue: "Failed to create OpenCode session"

**Check OpenCode is running:**

```bash
curl http://localhost:4096/app
```

**Check the base URL in credentials:**

- Should be `http://localhost:4096` (not `https://`)
- No trailing slash

### Issue: "Model not available"

**Check API keys are set:**

```bash
# In the terminal where you ran `opencode serve`
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

**Restart OpenCode with keys:**

```bash
ANTHROPIC_API_KEY=sk-ant-... opencode serve
```

### Issue: "Connection timeout"

**Check firewall:**

```bash
# Test connection
curl -v http://localhost:4096/app
```

### Issue: Node doesn't appear in n8n

**Check node is installed:**

```bash
ls ~/.n8n/custom/n8n-nodes-opencode/
# Should show: dist/, credentials/, package.json
```

**Check n8n logs:**

```bash
N8N_LOG_LEVEL=debug n8n start
# Look for "opencode" in the logs
```

## Monitoring

### Watch OpenCode Logs

OpenCode server will show logs for each request:

```
POST /session → Created session abc123
POST /session/abc123/prompt → Processing...
GET /event → Streaming response...
```

### Watch n8n Logs

In the terminal running n8n, you'll see:

```
Workflow execution started
Node "OpenCode Chat Model" started
Node "OpenCode Chat Model" finished
```

## Advanced Testing

### Test with File Attachments

Modify `OpenCodeChatModel.ts` to support file parts:

```typescript
// In convertMessagesToPromptParts
if (item.type === "file") {
  parts.push({
    type: "file",
    url: `file://${item.file_path}`,
    filename: item.filename,
    mime: item.mime_type,
  });
}
```

### Test Different Agents

Change the agent type in the node:

- `build` - For implementing features
- `chat` - For general conversation
- `debug` - For debugging code

### Test Session Management

The implementation creates one session per model instance. To test session reuse:

1. Send multiple prompts through the same workflow
2. Check OpenCode logs - should show session reuse
3. Sessions are cleaned up when the model is disposed

## Complete Test Checklist

- [ ] OpenCode server running on port 4096
- [ ] API keys configured for at least one provider
- [ ] n8n running on port 5678
- [ ] OpenCode node installed in n8n
- [ ] Credentials created and tested in n8n
- [ ] Simple workflow executes successfully
- [ ] Chat interface workflow works
- [ ] Streaming responses appear progressively
- [ ] Multiple messages in same session work
- [ ] Different model providers work
- [ ] Error handling works (try invalid model)

## Next Steps After Successful Testing

1. **Deploy to Kubernetes**

   - Use the deployment YAML in README.md
   - Update base URL to Kubernetes service

2. **Customize**

   - Add more model options
   - Implement file attachment support
   - Add custom error handling

3. **Share**
   - Create GitHub repository
   - Publish to npm
   - Share with n8n community

## Useful Commands Reference

```bash
# Start OpenCode
opencode serve

# Start OpenCode with logs
DEBUG=* opencode serve

# Test OpenCode API
curl http://localhost:4096/app
curl -X POST http://localhost:4096/session \
  -H "Content-Type: application/json" \
  -d '{"agent":"build","model":{"providerID":"anthropic","modelID":"claude-3-5-sonnet-20241022"}}'

# Start n8n
n8n start

# Start n8n with debug logs
N8N_LOG_LEVEL=debug n8n start

# Build node (in development)
npm run dev  # Watch mode

# Rebuild and reinstall
npm run build && cp -r dist ~/.n8n/custom/n8n-nodes-opencode/
```
