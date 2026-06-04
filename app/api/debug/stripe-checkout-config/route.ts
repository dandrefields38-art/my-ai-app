export async function GET(
  req: Request
) {
  const appUrl =
    (
      process.env.APP_URL ||
      process.env
        .NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin
    ).replace(/\/$/, "");
  const success_url =
    `${appUrl}/billing?checkout=lead-engine-success&session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url =
    `${appUrl}/upgrade?checkout=canceled`;

  return Response.json({
    APP_URL:
      process.env.APP_URL ||
      null,
    NEXT_PUBLIC_APP_URL:
      process.env
        .NEXT_PUBLIC_APP_URL ||
      null,
    appUrl,
    success_url,
    cancel_url,
  });
}
