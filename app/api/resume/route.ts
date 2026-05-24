import OpenAI from "openai";
import pdfParse from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return Response.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const parsed = await pdfParse(buffer);

    const resumeText = parsed.text;

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content:
              "You are a professional AI recruiter. Extract resume details and summarize them cleanly.",
          },

          {
            role: "user",
            content: `
Analyze this resume and return:

- Full Name
- Skills
- Work Experience
- Education
- Suggested Careers
- Short Summary

Resume:
${resumeText}
`,
          },
        ],
      });

    const response =
      completion.choices[0].message.content;

    return Response.json({
      parsed: response,
    });
  } catch (error) {
    console.log(
      "RESUME PARSE ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to parse resume",
      },
      {
        status: 500,
      }
    );
  }
}