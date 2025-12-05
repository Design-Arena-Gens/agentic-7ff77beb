## Flowstate Kanban

Modern kanban workspace built with Next.js 14 and the App Router. Plan work, collaborate across swimlanes, and keep delivery flow transparent from idea to done.

### Features
- Five ready-to-go columns with custom drag-and-drop between stages
- Local storage persistence so boards survive refreshes
- Priority cycling, quick move buttons, and duplicate/remove task utilities
- Search plus filters for priority, tag, and assignee
- Inline task creation form with due date, metadata chips, and status selection
- Snapshot stats that surface column load and completion progress

### Quickstart
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to open the board.

### Building & Linting
```bash
npm run lint
npm run build
```

### Resetting Demo Data
Use the **Restore demo data** button at the top of the board to replace your local storage state with the seeded sample tasks.

### Deployment
The project is optimised for Vercel deployments. Run:
```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-7ff77beb
```

After deploying, verify the live site with:
```bash
curl https://agentic-7ff77beb.vercel.app
```
