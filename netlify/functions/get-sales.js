exports.handler = async () => {
  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    const secret = process.env.PORTAL_SECRET;

    if (!scriptUrl || !secret) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: "Missing GOOGLE_SCRIPT_URL or PORTAL_SECRET"
        })
      };
    }

    const url = `${scriptUrl}?action=portalData&token=${encodeURIComponent(secret)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: data.error || "Failed to fetch sales data"
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sales: Array.isArray(data.sales) ? data.sales : []
      })
    };
  } catch (error) {
    console.error("get-sales error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Server error while fetching sales data"
      })
    };
  }
};
