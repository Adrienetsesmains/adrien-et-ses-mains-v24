import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("❌ Clé RESEND_API_KEY absente");

      return NextResponse.json(
        {
          ok: false,
          error: "Service d’envoi de mail non configuré.",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);

    const { to, subject, text, pdfBase64, filename } =
      await req.json();

    console.log("➡️ Envoi mail demandé pour :", to);

    if (!subject || !text || !pdfBase64 || !filename) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informations d’envoi incomplètes.",
        },
        { status: 400 }
      );
    }

    const contenuPdf = pdfBase64.includes(",")
      ? pdfBase64.split(",")[1]
      : pdfBase64;

    const result = await resend.emails.send({
      from: "Adrien et ses mains <onboarding@resend.dev>",
      to: "adrienetsesmains@gmail.com",
      subject,
      text,
      attachments: [
        {
          filename,
          content: contenuPdf,
        },
      ],
    });

    if (result.error) {
      console.error("❌ Erreur Resend :", result.error);

      return NextResponse.json(
        {
          ok: false,
          error: "Échec de l’envoi du mail.",
        },
        { status: 500 }
      );
    }

    console.log("✅ Résultat Resend :", result.data);

    return NextResponse.json({
      ok: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Erreur envoi mail :", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur interne pendant l’envoi du mail.",
      },
      { status: 500 }
    );
  }
}