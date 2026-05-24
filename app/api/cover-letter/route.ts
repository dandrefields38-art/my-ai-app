import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      resume,
      jobTitle,
      company,
    } = await req.json();

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content:
              "You are a professional career coach and expert cover letter writer.",
          },

          {
            role: "user",
            content: `
Create a professional personalized cover letter.

JOB TITLE:
${jobTitle}

COMPANY:
${company}

RESUME:
${resume}

Make it modern, concise, and strong.
`,
          },
        ],
      });

    return Response.json({
      coverLetter:
        completion.choices[0]
          .message.content,
    });
  } catch (error) {
    console.log(
      "COVER LETTER ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to generate cover letter",
      },
      {
        status: 500,
      }
    );
  }
}