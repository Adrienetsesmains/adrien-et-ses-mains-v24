import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, subject, text, pdfBase64, filename } = await req.json();

    await resend.emails.send({
      from: "Adrien et ses mains <onboarding@resend.dev>",
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur envoi mail :", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
