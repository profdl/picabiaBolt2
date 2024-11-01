export async function handler(event) {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://picabia.ai",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify({ message: "Success" }),
  };
}
