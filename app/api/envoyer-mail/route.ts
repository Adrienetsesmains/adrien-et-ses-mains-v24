import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      to,
      subject,
      text,
      pdfBase64,
      filename,
    } = body;
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur envoi mail :", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}