# Farzad AI

An AI-powered chatbot that answers questions in the style of Farzad Mesbahi, featuring first-principles thinking and deep analysis of technology, Tesla, AI, and markets.

## Features

- **FarzadGPT Chat**: AI chatbot that responds with Farzad's communication style and perspectives
- **Knowledge Base**: Built-in knowledge from YouTube transcripts and manual input
- **Chat History**: Persistent conversation history stored locally
- **Topic Cards**: Quick-start topics for common areas of interest
- **Dark/Light Mode**: Theme toggle for comfortable viewing
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4
- **Storage**: LocalStorage for chat history (upgradeable to database)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key

### Installation

1. Navigate to the project directory:
   ```bash
   cd farzad-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-api-key-here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
farzad-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # Chat API endpoint
│   │   │   └── knowledge/     # Knowledge base API
│   │   ├── components/        # React components
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Icons.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopicCards.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── knowledge.ts       # Knowledge base data
│   │   └── system-prompt.ts   # AI system prompt
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Adding Knowledge

### Manual Knowledge Input

Edit `src/lib/knowledge.ts` to add knowledge items:

```typescript
{
  id: "unique-id",
  source: "manual", // or "youtube"
  title: "Topic Title",
  content: `Your content here...`,
  sourceUrl: "https://optional-source-url",
  createdAt: new Date(),
}
```

### YouTube Transcript Import (Future)

The system is designed to support YouTube transcript import. To add this feature:

1. Use the YouTube API or a transcript service to fetch video transcripts
2. Process transcripts into structured knowledge items
3. Store in the knowledge base (database recommended for scale)

## API Endpoints

### POST /api/chat

Send messages to the AI chatbot.

```json
{
  "messages": [
    { "role": "user", "content": "What is Tesla's FSD strategy?" }
  ]
}
```

### GET /api/knowledge

Retrieve all knowledge items or search.

```
GET /api/knowledge          # All items
GET /api/knowledge?q=tesla  # Search for "tesla"
```

### POST /api/knowledge

Add new knowledge items (in development mode, not persisted).

## Customization

### Changing the AI Personality

Edit `src/lib/system-prompt.ts` to modify:
- Communication style
- Areas of expertise
- Response characteristics

### Adding Topic Cards

Edit `src/app/components/TopicCards.tsx` to add or modify quick-start topics.

### Theming

Edit `src/app/globals.css` CSS variables for custom colors.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add `OPENAI_API_KEY` environment variable
4. Deploy

### Other Platforms

Build the production version:
```bash
npm run build
npm start
```

## Future Enhancements

- [ ] Database integration (Supabase/PostgreSQL)
- [ ] Vector database for semantic search (Pinecone/Weaviate)
- [ ] YouTube transcript auto-import
- [ ] User authentication
- [ ] Admin panel for knowledge management
- [ ] Streaming responses
- [ ] Voice input/output

## License

Private project - All rights reserved.
