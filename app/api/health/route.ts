export async function GET() {
  return Response.json({
    status: "ok",
    app: "clipped",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  })
}
