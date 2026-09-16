# Laptop AI Advisor

Laptop AI Advisor is a full-stack AI-powered product recommendation platform for a laptop retail catalogue. It helps customers find suitable laptops through a conversational assistant while keeping recommendations grounded in structured catalogue data.

## Live Demo

Add the current production URL here:

```text
https://laptopadvisor.vercel.app/
```

## Source Code

```text
https://github.com/mj-dx/LaptopAIAdvisor
```

## Industry Choice

The selected industry is **laptop retail / consumer electronics**.

Laptops are a strong fit for an AI recommendation system because customers compare products using structured attributes such as price, CPU, RAM, storage, GPU, screen, battery, brand, and intended use. The catalogue therefore acts as the source of truth for recommendations and product-specific claims.

## Main Features

### Customer Product Catalogue

The public catalogue displays products stored in Supabase. Each product can contain:

- Product name
- Brand
- Description
- Price
- CPU
- RAM
- Storage
- GPU
- Screen
- Battery information
- Product image

The catalogue can be edited by an authorized administrator without code changes.

### Grounded AI Shopping Assistant

The assistant can:

- Understand Arabic
- Understand English
- Understand Arabizi
- Handle mixed-language messages
- Recommend products from the real catalogue
- Compare suitable products
- Respect customer budget constraints
- Return validated product IDs
- Avoid displaying products that do not exist in the catalogue

Recommended IDs returned by Gemini are validated against the current database before product cards are shown.

### AI Quality Evaluation

Each assistant answer is evaluated separately for:

- Accuracy
- Hallucination risk
- Flagged status
- Evaluation summary
- Unsupported claims

Automatic flagging is applied when:

```text
Hallucination Risk >= 30%
OR
Accuracy < 80%
```

Scores are stored with assistant messages and can be reviewed in the admin dashboard.

### Gemini Reliability

Gemini calls retry temporary errors including:

```text
408
429
500
502
503
504
```

Retries use exponential backoff with jitter.

The evaluator is treated as a non-critical dependency. If evaluation remains unavailable after retries, the AI answer is still returned and stored rather than failing the whole chat request.

In this case:

```text
accuracy_score = NULL
hallucination_risk = NULL
evaluation status = unavailable
```

### Conversation Persistence

The system stores:

- Conversation ID
- Message role
- Message content
- Recommended product IDs
- Accuracy score
- Hallucination risk
- Flagged status
- Evaluation details
- Timestamps

### Secure Conversation Reports

When a conversation ends, the customer can receive a secure report link.

The report includes:

- Customer request summary
- Recommended products
- Recommendation reasoning
- Full conversation
- Average accuracy
- Average hallucination risk
- Flagged-answer count
- Customer feedback

A random report token is generated and only its SHA-256 hash is stored in the database.

### Customer Feedback

Customers can submit:

- Rating from 1 to 5
- Optional written comment

Feedback is linked to the relevant conversation and visible to administrators.

### Admin Dashboard

Authorized administrators can access:

- Product management
- Conversation monitoring
- Full conversation details
- Per-message evaluation scores
- Conversation-level average scores
- Flagged-answer monitoring
- Customer feedback
- Dashboard statistics
- Logout

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| AI | Google Gemini API |
| Deployment | Vercel |
| Source Control | Git and GitHub |

## Architecture

```text
Customer Browser
        |
        v
Next.js Application
        |
        +-----------------------------+
        |                             |
        v                             v
Next.js API Routes                Supabase
        |                             |
        |                             +-- products
        |                             +-- conversations
        |                             +-- messages
        |                             +-- feedback
        |                             +-- admins
        |                             +-- product-images
        |
        v
Gemini API
        |
        +-- Chat generation
        |
        +-- Quality evaluation
```

Sensitive writes and private conversation-report reads are handled server-side.

## Database Structure

### `products`

```text
id
name
brand
description
price
cpu
ram
storage
gpu
screen
battery
image_url
created_at
```

### `conversations`

```text
id
created_at
ended_at
report_token_hash
report_created_at
```

### `messages`

```text
id
conversation_id
role
content
accuracy_score
hallucination_risk
flagged
recommended_product_ids
evaluation_details
created_at
```

### `feedback`

```text
conversation_id
rating
comment
created_at
```

### `admins`

```text
user_id
```

## Security

### Row Level Security

Supabase Row Level Security protects sensitive tables. Public users do not receive unrestricted direct access to conversations, messages, feedback, or admin data.

### Server-Side Secrets

Sensitive values stay server-side:

```text
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

They must never use the `NEXT_PUBLIC_` prefix.

### Admin Authorization

Administrators authenticate through Supabase Auth and must also exist in the `admins` table.

The shared admin layout acts as the UI authorization guard while Supabase RLS remains the actual database-security boundary.

### Secure Report Access

Report links require both:

```text
conversation_id + secure report token
```

Only a SHA-256 hash of the token is stored.

## AI Grounding Strategy

```text
Load products from database
        |
        v
Send catalogue to Gemini
        |
        v
Gemini returns answer + product IDs
        |
        v
Validate IDs against catalogue
        |
        v
Discard invalid IDs
        |
        v
Show validated product cards
```

This adds deterministic validation between model output and customer-facing recommendations.

## Quality Scoring Method

The evaluator receives:

- Customer message
- Assistant answer
- Validated recommended product IDs
- Current product catalogue

It estimates accuracy and hallucination risk and returns unsupported claims plus a short explanation.

A response is automatically flagged when:

```text
hallucination_risk >= 30
OR
accuracy_score < 80
```

The evaluator is a monitoring signal, not a perfect factual guarantee. In production, important factual checks should increasingly move toward deterministic validation.

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_SERVICE_ROLE_KEY=your_server_only_supabase_secret
GEMINI_API_KEY=your_gemini_api_key
```

Optional:

```env
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_EVALUATOR_MODEL=gemini-3.1-flash-lite
```

Do not commit `.env.local`.

## Local Development

```bash
git clone https://github.com/mj-dx/LaptopAIAdvisor.git
cd LaptopAIAdvisor
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Before deployment:

```bash
npm run build
```

## Main Routes

### Public

```text
/
```

```text
/catalogue
```

```text
/chat
```

```text
/report/[id]?token=...
```

### Admin

```text
/admin/login
/admin
/admin/products
/admin/conversations
/admin/conversations/[id]
/admin/feedback
```

## Deployment

The application is deployed on Vercel. The GitHub repository is connected to Vercel, so pushes to the configured production branch can trigger automatic deployments.

Required production environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

## Cost at 1,000 Conversations per Day

Cost depends mainly on the number of AI turns and token volume. The current design may use two Gemini calls for each assistant answer: one for generation and one for evaluation. Assuming roughly four AI answers per conversation and a moderate catalogue/context size, a practical planning estimate for the AI portion is approximately **$250-$350 per month** at current Gemini 3.1 Flash-Lite paid rates, before any Vercel or Supabase overages. Actual cost can vary significantly with prompt size and conversation length.

I would reduce cost by compacting the catalogue context, limiting conversation history, caching stable context, replacing part of the LLM-based evaluator with deterministic checks, selectively evaluating only responses that need it, and monitoring actual token usage before scaling.

## What I Would Build Next

1. Move admin authorization fully to server-side session validation.
2. Add rate limiting to public AI endpoints.
3. Add abuse protection.
4. Add structured logging for Gemini latency, retries, errors, and token usage.
5. Add deterministic validation for product prices and specifications.
6. Reduce dependence on a second LLM call for evaluation.
7. Add pagination for large conversation and feedback datasets.
8. Add aggregate analytics.
9. Add report-token expiration and revocation.
10. Add automated tests for catalogue grounding, auth, RLS, reports, and API failure cases.
11. Add monitoring for repeated hallucination flags.
12. Optimize catalogue context for larger inventories.

## What I Would Not Fully Trust Yet

I would not treat the current evaluator score as a perfect factual guarantee because it is itself produced by an AI model. The architecture reduces risk through catalogue grounding and product-ID validation, but production-grade safety should add deterministic checks for prices and specifications, automated tests, rate limiting, monitoring, report-token lifecycle controls, and review workflows for repeatedly flagged conversations.

Temporary third-party AI availability is also an operational risk, which is why retries and graceful evaluator fallback are implemented.

## Production Handling of High-Risk Answers

In production, a high-risk answer should:

- Store the flag and evaluation details
- Remain visible in the admin dashboard
- Be included in monitoring
- Trigger deterministic checks for critical fields
- Be queued for review when severe
- Contribute to future prompt and validation improvements
- Be regenerated or blocked when deterministic validation detects a serious mismatch

## AI and Development Tools

AI-assisted development tools were used for:

- Implementation guidance
- Code review
- Debugging
- UX iteration
- Documentation
- Prompt design

Final integration, database rules, deployment configuration, credentials, and application behavior remain part of the implemented project architecture.

## Current Project Status

Implemented:

- Product catalogue
- Admin product management
- Product image storage
- Admin authentication
- Database RLS protection
- Multilingual AI chat
- Catalogue-grounded recommendations
- Product ID validation
- Per-answer quality evaluation
- Conversation persistence
- Gemini retry handling
- Graceful evaluator fallback
- Admin dashboard
- Conversation list
- Full conversation view
- Feedback administration
- Secure conversation reports
- Customer ratings and comments
- Vercel deployment workflow

The application is suitable as a technical-assessment demonstration and contains the main architecture needed for further production hardening.

## Repository

```text
https://github.com/mj-dx/LaptopAIAdvisor
```

## Author

Mohammad Hamdan
