exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }

    const { email, password } = JSON.parse(event.body || "{}");

    const correctEmail = process.env.PORTAL_LOGIN_EMAIL;
    const correctPassword = process.env.PORTAL_LOGIN_PASSWORD;

    if (!correctEmail || !correctPassword) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing login environment variables" })
      };
    }

    const emailMatches =
      String(email).trim().toLowerCase() === correctEmail.trim().toLowerCase();

    const passwordMatches =
      String(password).trim() === correctPassword.trim();

    if (!emailMatches || !passwordMatches) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid email or password" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          email: correctEmail
        }
      })
    };
  } catch (error) {
    console.error("login function error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
