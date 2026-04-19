'use client';

import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';

export default function DevelopersPage() {
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ApiEndpoint = ({ method, path, description, params, example, response }) => (
    <div className="mb-8 border-l-4 border-blue-600 pl-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          method === 'GET' ? 'bg-blue-100 text-blue-700' :
          method === 'POST' ? 'bg-green-100 text-green-700' :
          method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {method}
        </span>
        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">{path}</code>
      </div>
      <p className="text-gray-700 mb-4">{description}</p>
      
      {params && (
        <div className="mb-4">
          <p className="font-semibold text-sm text-gray-900 mb-2">Parameters:</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1 px-2 font-medium">Name</th>
                <th className="text-left py-1 px-2 font-medium">Type</th>
                <th className="text-left py-1 px-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-b border-gray-200">
                  <td className="py-1 px-2"><code className="bg-gray-100 px-1 rounded">{p.name}</code></td>
                  <td className="py-1 px-2"><code className="text-gray-600">{p.type}</code></td>
                  <td className="py-1 px-2">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {example && (
        <div className="mb-4">
          <p className="font-semibold text-sm text-gray-900 mb-2">Example Request:</p>
          <div className="relative bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs font-mono">{example}</pre>
            <button
              onClick={() => copyToClipboard(example, `example-${path}`)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 p-2 rounded transition"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      {response && (
        <div>
          <p className="font-semibold text-sm text-gray-900 mb-2">Example Response:</p>
          <div className="relative bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs font-mono">{JSON.stringify(response, null, 2)}</pre>
            <button
              onClick={() => copyToClipboard(JSON.stringify(response, null, 2), `response-${path}`)}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 p-2 rounded transition"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-2">Lyniro API</h1>
          <p className="text-blue-100">Integrate your onboarding workflows with your tools</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Documentation</h3>
              <nav className="space-y-2">
                {[
                  { id: 'intro', label: 'Introduction' },
                  { id: 'auth', label: 'Authentication' },
                  { id: 'rate-limits', label: 'Rate Limits' },
                  { id: 'plans', label: 'Plans' },
                  { id: 'tasks', label: 'Tasks' },
                  { id: 'messages', label: 'Messages' },
                  { id: 'webhooks', label: 'Webhooks' },
                  { id: 'integrations', label: 'Integrations' },
                  { id: 'errors', label: 'Error Reference' },
                ].map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block py-2 px-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Introduction */}
            <section id="intro" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Lyniro API lets you integrate your onboarding workflows with your existing tools. Build custom integrations with Zapier, Make, HubSpot, or any platform that supports HTTP requests.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Availability:</strong> API access is available on Growth ($199/mo) and Scale ($399/mo) plans.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Base URL:</strong> <code className="bg-white px-2 py-1 rounded font-mono">https://app.lyniro.com/api/v1</code>
                </p>
              </div>
            </section>

            {/* Authentication */}
            <section id="auth" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication</h2>
              <p className="text-gray-700 mb-4">
                All API requests must include your API key in the Authorization header.
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
                <pre className="text-xs font-mono">Authorization: Bearer lyr_live_your_api_key_here</pre>
              </div>
              <p className="text-gray-700 mb-4">
                <strong>Generate your API key</strong> in the <a href="/settings" className="text-blue-600 hover:text-blue-700">Settings → API Keys</a> page.
              </p>
              <p className="text-gray-700 font-semibold mb-2">Example with curl:</p>
              <div className="relative bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
                <pre className="text-xs font-mono">{`curl https://app.lyniro.com/api/v1/plans \\
  -H "Authorization: Bearer lyr_live_your_api_key_here"`}</pre>
                <button
                  onClick={() => copyToClipboard(`curl https://app.lyniro.com/api/v1/plans \\
  -H "Authorization: Bearer lyr_live_your_api_key_here"`, 'curl-example')}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 p-2 rounded transition"
                >
                  <Copy size={14} />
                </button>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Rate Limits</h2>
              <p className="text-gray-700 mb-4">
                Each API key is limited to <strong>100 requests per minute</strong>. Rate limit information is included in every response header.
              </p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-sm font-mono text-gray-900">
                  <span className="block">X-RateLimit-Limit: 100</span>
                  <span className="block">X-RateLimit-Remaining: 99</span>
                </p>
              </div>
              <p className="text-gray-700">
                When you exceed the limit, you'll receive a <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">429 Too Many Requests</code> response with a <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">Retry-After</code> header.
              </p>
            </section>

            {/* Plans */}
            <section id="plans" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Plans</h2>
              <ApiEndpoint
                method="GET"
                path="/plans"
                description="List all onboarding plans for your vendor."
                params={[
                  { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
                  { name: 'limit', type: 'integer', description: 'Results per page (default: 20)' },
                  { name: 'stage', type: 'string', description: 'Filter by stage (e.g., active, completed)' },
                  { name: 'search', type: 'string', description: 'Search by company name or customer name' },
                ]}
                example={`GET /api/v1/plans?page=1&limit=20
Authorization: Bearer lyr_live_your_api_key_here`}
                response={{
                  success: true,
                  data: [
                    {
                      id: 123,
                      customer_name: 'John Doe',
                      company_name: 'Acme Corp',
                      stage: 'active',
                      completion_percentage: 45,
                      created_at: '2024-01-15T10:30:00Z',
                      go_live_date: '2024-02-15T00:00:00Z'
                    }
                  ],
                  meta: { page: 1, limit: 20, total: 45 }
                }}
              />
              <ApiEndpoint
                method="GET"
                path="/plans/{id}"
                description="Get details of a specific plan including stages and tasks."
                example={`GET /api/v1/plans/123
Authorization: Bearer lyr_live_your_api_key_here`}
              />
              <ApiEndpoint
                method="POST"
                path="/plans"
                description="Create a new onboarding plan."
                params={[
                  { name: 'customer_name', type: 'string', description: 'Customer name (required)' },
                  { name: 'company_name', type: 'string', description: 'Company name (required)' },
                  { name: 'customer_email', type: 'string', description: 'Customer email (required)' },
                  { name: 'template_id', type: 'integer', description: 'Template ID (optional)' },
                  { name: 'go_live_date', type: 'date', description: 'Go-live date (optional)' },
                ]}
                example={`POST /api/v1/plans
Content-Type: application/json
Authorization: Bearer lyr_live_your_api_key_here

{
  "customer_name": "John Doe",
  "company_name": "Acme Corp",
  "customer_email": "john@acme.com",
  "go_live_date": "2024-02-15"
}`}
              />
              <ApiEndpoint
                method="PATCH"
                path="/plans/{id}"
                description="Update a plan's stage or go-live date."
                params={[
                  { name: 'stage', type: 'string', description: 'New stage' },
                  { name: 'go_live_date', type: 'date', description: 'New go-live date' },
                ]}
                example={`PATCH /api/v1/plans/123
Content-Type: application/json
Authorization: Bearer lyr_live_your_api_key_here

{
  "stage": "completed",
  "go_live_date": "2024-02-20"
}`}
              />
            </section>

            {/* Tasks */}
            <section id="tasks" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Tasks</h2>
              <ApiEndpoint
                method="GET"
                path="/plans/{planId}/tasks"
                description="Get all tasks for a plan."
                example={`GET /api/v1/plans/123/tasks
Authorization: Bearer lyr_live_your_api_key_here`}
              />
              <ApiEndpoint
                method="PATCH"
                path="/plans/{planId}/tasks/{taskId}"
                description="Update a task's status (pending, in_progress, completed, blocked)."
                params={[
                  { name: 'status', type: 'string', description: 'New status' },
                  { name: 'blocked_reason', type: 'string', description: 'Reason if blocked' },
                ]}
                example={`PATCH /api/v1/plans/123/tasks/456
Content-Type: application/json
Authorization: Bearer lyr_live_your_api_key_here

{
  "status": "completed"
}`}
              />
            </section>

            {/* Messages */}
            <section id="messages" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Messages</h2>
              <ApiEndpoint
                method="GET"
                path="/plans/{planId}/messages"
                description="Get the last 50 messages for a plan."
                example={`GET /api/v1/plans/123/messages
Authorization: Bearer lyr_live_your_api_key_here`}
              />
              <ApiEndpoint
                method="POST"
                path="/plans/{planId}/messages"
                description="Send a message to a plan."
                params={[
                  { name: 'content', type: 'string', description: 'Message content (required)' },
                  { name: 'sender_type', type: 'string', description: 'Sender type: vendor or system' },
                ]}
                example={`POST /api/v1/plans/123/messages
Content-Type: application/json
Authorization: Bearer lyr_live_your_api_key_here

{
  "content": "The final requirements document has been reviewed",
  "sender_type": "vendor"
}`}
              />
            </section>

            {/* Webhooks */}
            <section id="webhooks" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Webhooks</h2>
              <p className="text-gray-700 mb-4">
                Register webhooks to receive real-time updates when plans, tasks, or messages change.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Available events:</strong> plan.created, plan.completed, task.completed, task.blocked, message.received
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-blue-900 mb-2">Webhook Verification</p>
                <p className="text-blue-800 text-sm mb-2">
                  Each webhook includes an <code className="bg-white px-1 rounded">X-Lyniro-Signature</code> header. Verify it with your webhook secret:
                </p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                  <pre>{`const signature = req.headers['x-lyniro-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');
const isValid = signature === expected;`}</pre>
                </div>
              </div>

              <ApiEndpoint
                method="POST"
                path="/webhooks"
                description="Register a new webhook URL."
                params={[
                  { name: 'url', type: 'string', description: 'HTTPS webhook URL (required)' },
                  { name: 'events', type: 'array', description: 'Array of events to subscribe to (required)' },
                ]}
                example={`POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer lyr_live_your_api_key_here

{
  "url": "https://example.com/webhooks/lyniro",
  "events": ["plan.created", "task.completed"]
}`}
              />
              <ApiEndpoint
                method="GET"
                path="/webhooks"
                description="List all registered webhooks."
                example={`GET /api/v1/webhooks
Authorization: Bearer lyr_live_your_api_key_here`}
              />
              <ApiEndpoint
                method="DELETE"
                path="/webhooks/{webhookId}"
                description="Delete a webhook."
                example={`DELETE /api/v1/webhooks/789
Authorization: Bearer lyr_live_your_api_key_here`}
              />
            </section>

            {/* Integrations */}
            <section id="integrations" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Common Integrations</h2>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Zapier</h3>
                <p className="text-gray-700 mb-3">
                  Use Lyniro webhooks with Zapier's Webhooks by Zapier trigger to create automated workflows.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm mb-4">
                  <li>Register a webhook URL in Lyniro API (use your Zapier webhook URL)</li>
                  <li>In Zapier, add a "Webhooks by Zapier" trigger for the same URL</li>
                  <li>Connect Lyniro events to your favorite apps</li>
                </ol>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Make (formerly Integromat)</h3>
                <p className="text-gray-700 mb-3">
                  Create automated workflows with Make by using the Custom Webhook trigger.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm mb-4">
                  <li>Create a new scenario in Make</li>
                  <li>Add a Custom Webhook trigger</li>
                  <li>Register that webhook URL in Lyniro</li>
                  <li>Use the webhook data to trigger actions in any Make app</li>
                </ol>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">HubSpot</h3>
                <p className="text-gray-700 mb-3">
                  Sync Lyniro plan data to HubSpot companies using the API.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                  <li>Get your HubSpot API key</li>
                  <li>Use Lyniro's Plans API to fetch plan data</li>
                  <li>POST to HubSpot's Companies API to create or update companies</li>
                  <li>Optional: Set up webhooks to sync changes in real-time</li>
                </ol>
              </div>
            </section>

            {/* Error Reference */}
            <section id="errors" className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Error Reference</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Code</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Description</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">What to do</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">UNAUTHORIZED</code></td>
                    <td className="py-2 px-3">Invalid or missing API key</td>
                    <td className="py-2 px-3">Check your API key in Settings</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">FORBIDDEN</code></td>
                    <td className="py-2 px-3">Missing required permission</td>
                    <td className="py-2 px-3">Regenerate key with correct permissions</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">NOT_FOUND</code></td>
                    <td className="py-2 px-3">Resource not found</td>
                    <td className="py-2 px-3">Verify the resource ID is correct</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">VALIDATION_ERROR</code></td>
                    <td className="py-2 px-3">Invalid request data</td>
                    <td className="py-2 px-3">Check the request parameters</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">RATE_LIMITED</code></td>
                    <td className="py-2 px-3">Exceeded 100 requests/min</td>
                    <td className="py-2 px-3">Wait and retry using Retry-After header</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">PLAN_LIMIT_REACHED</code></td>
                    <td className="py-2 px-3">Can't create more plans</td>
                    <td className="py-2 px-3">Upgrade your subscription plan</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3"><code className="bg-gray-100 px-1 rounded font-mono">SERVER_ERROR</code></td>
                    <td className="py-2 px-3">Unexpected server error</td>
                    <td className="py-2 px-3">Try again later or contact support</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <p>&copy; 2024 Lyniro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="mailto:hello@lyniro.com" className="hover:text-white transition">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
