export async function GET() {
  return Response.json({
    APP_URL:
      process.env.APP_URL ||
      null,
    NEXT_PUBLIC_APP_URL:
      process.env
        .NEXT_PUBLIC_APP_URL ||
      null,
    VERCEL_URL:
      process.env.VERCEL_URL ||
      null,
  });
}
