const nodemailer = require("nodemailer");

// Function to generate a random verification token
function generateVerificationToken() {
  return Math.random().toString(36).substr(2, 10);
}

// Function to send verification email
async function sendVerificationEmail(email, token) {
  try {
    // Create a test account with Ethereal
    const testAccount = await nodemailer.createTestAccount();

    // Create a nodemailer transporter using the test account
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: "your@example.com",
      to: email,
      subject: "Email Verification",
      html: `<p>Click <a href="http://yourwebsite.com/verify?token=${token}">here</a> to verify your email.</p>`,
    });

    console.log(
      "Email verification sent:",
      nodemailer.getTestMessageUrl(info)
    );
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  generateVerificationToken,
};
