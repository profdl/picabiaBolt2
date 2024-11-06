Replicate Webhook Documenntation

Replicate can send an HTTP POST request to the URL you specified whenever the prediction is created, has new logs, new output, or is completed.

The request body is a prediction object in JSON format. This object has the same structure as the object returned by the get a prediction API. Here's an example of an unfinished prediction:


Copy
{
  "id": "ufawqhfynnddngldkgtslldrkq",
  "version": "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
  "created_at": "2022-04-26T22:13:06.224088Z",
  "started_at": null,
  "completed_at": null,
  "status": "starting",
  "input": {
    "text": "Alice"
  },
  "output": null,
  "error": null,
  "logs": null,
  "metrics": {}
}
Refer to Prediction status for the list of possible status values.

Here's an example of a Next.js webhook handler:

Copy
// pages/api/replicate-webhook.js
export default async function handler(req, res) {
  console.log("🪝 incoming webhook!", req.body.id);
  const prediction = req.body;
  await saveToMyDatabase(prediction);
  await sendSlackNotification(prediction);
  res.end();
}

By default, Replicate sends requests to your webhook URL whenever there are new outputs or the prediction has finished. You can change which events trigger a webhook using the webhook_events_filter property.

Your endpoint should respond with a 2xx status code within a few seconds; otherwise, the webhook might be retried.

Retries
When Replicate sends the final webhook for a prediction (where the status is succeeded, failed or canceled), we check the response status we get. If we can't make the request at all, or if we get a 4xx or 5xx response, we'll retry the webhook. We retry several times on an exponential backoff. The final retry is sent about 1 minute after the prediction completed.

We do not retry any webhooks for intermediate states.

Idempotency
Make webhook handlers idempotent. Identical webhooks can be sent more than once, so you'll need handle potentially duplicate information.




