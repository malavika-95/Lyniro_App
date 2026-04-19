import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    const { csmEmail, csmName, customerName, message } = await request.json();

    // Email body
    const emailBody = `
Hi ${csmName},

${customerName} has reached out for help with their onboarding:

"${message}"

Please reach out to them as soon as possible.

Best regards,
OnboardFlow
    `.trim();

    // Simple email logging (in production, integrate with Nodemailer or SendGrid)
    console.log(`Help email from ${customerName} to ${csmEmail}:`, message);

    return NextResponse.json({ 
      success: true, 
      message: "Help request sent to your onboarding manager" 
    });
  } catch (error) {
    console.error("Error sending help email:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
