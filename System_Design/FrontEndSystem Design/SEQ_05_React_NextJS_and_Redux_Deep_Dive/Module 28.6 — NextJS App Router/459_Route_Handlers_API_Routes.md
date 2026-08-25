# 459 – Route Handlers and API Routes

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Route Handlers** (App Router) = `route.ts` files that define HTTP endpoints (GET, POST, PUT, DELETE). Replace `/pages/api/*` from Pages Router. RESTful API endpoints within Next.js. Support streaming, headers, cookies, redirect. Colocated with app routes.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── BASIC ROUTE HANDLER ────
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const posts = await db.post.findMany();
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const post = await db.post.create({ data: body });
  return NextResponse.json(post, { status: 201 });
}

// ──── DYNAMIC ROUTE HANDLER ────
// app/api/posts/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const post = await db.post.findUnique({ where: { id: params.id } });
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const post = await db.post.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(post);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await db.post.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

// ──── QUERY PARAMETERS ────
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });
  
  return NextResponse.json({ posts, page, limit });
}

// ──── HEADERS AND COOKIES ────
import { cookies, headers } from 'next/headers';

export async function GET() {
  const headersList = headers();
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;
  
  const response = NextResponse.json({ data: 'hello' });
  response.headers.set('X-Custom-Header', 'value');
  response.cookies.set('visited', 'true', { httpOnly: true });
  
  return response;
}

// ──── STREAMING ────
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 5; i++) {
        controller.enqueue(encoder.encode(`data: ${i}\n\n`));
        await new Promise(r => setTimeout(r, 1000));
      }
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ──── FORM DATA ────
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const file = formData.get('file') as File;
  
  return NextResponse.json({ name, fileSize: file.size });
}

// ──── CACHING ────
// GET is cached by default (static)
// To opt out:
export const dynamic = 'force-dynamic'; // always dynamic
export const revalidate = 60; // ISR — revalidate every 60s
```

### Pages Router vs App Router API
| Feature | Pages Router (`/pages/api`) | App Router (`route.ts`) |
|---|---|---|
| Location | `/pages/api/*.ts` | `/app/api/*/route.ts` |
| Handler | `export default handler(req, res)` | `export async function GET/POST()` |
| Request | `NextApiRequest` | `NextRequest` (Web API) |
| Response | `res.json()` | `NextResponse.json()` |
| Edge runtime | Limited | Full support |
| Streaming | Manual | Built-in |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Route Handlers: route.ts files with exported GET/POST/PUT/DELETE functions. Use NextRequest/NextResponse (Web standard APIs). Support streaming, headers, cookies. Cached by default for GET. Dynamic: export const dynamic = 'force-dynamic'. Replace Pages Router /pages/api/ endpoints."*

## 4. 🧠 MEMORY AID
**"route.ts = export GET/POST/PUT/DELETE. NextRequest + NextResponse. GET cached by default. dynamic='force-dynamic' to opt out."**
