# VISA Reconciliation Frontend

A responsive web application for uploading, previewing, reconciling, and reviewing VISA transaction data. The application supports both **Issuing** and **Acquiring** workflows and provides paginated reconciliation results for matched, missing, and reversed transactions.

## Features

- Issuing and Acquiring transaction workflows
- Issuing CBS/BO and Acquiring GL/FE/EP file uploads with progress feedback
- Paginated transaction previews for every file type
- Search, sorting, column visibility, reset, and page-size controls
- Reconciliation runs with duplicate-request protection
- Run summary cards for:
  - Matched
  - Missing In CBS
  - Missing In BO
  - Reverse Transaction
- Paginated reconciliation detail tables
- Loading, empty, and API error states
- Responsive sidebar-based interface
- Light, dark, and configurable color themes
- Clean Output URLs—the run ID and summary values are not exposed in query parameters

## Technology Stack

- [Next.js](https://nextjs.org/) 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI and shadcn-style components
- TanStack Table
- Lucide icons
- Sonner notifications

## Application Workflow

```text
Upload CBS/BO files
        ↓
Preview uploaded transactions
        ↓
Run reconciliation
        ↓
Open /issuing/output or /acquiring/output
        ↓
Review KPI summary
        ↓
View paginated category details
```

After a reconciliation finishes, its summary is stored in browser session storage and the application navigates to a clean Output URL. The returned `runId` remains available for paginated detail requests without being displayed in the address bar.

Session storage is scoped to the current browser tab. Refreshing the tab preserves the latest run, while closing the tab clears it.

## Routes

| Route | Description |
| --- | --- |
| `/` | Application entry page |
| `/login` | Login screen |
| `/dashboard` | Dashboard |
| `/issuing/upload` | Upload Issuing CBS and BO files |
| `/issuing/preview` | Preview Issuing transactions and run reconciliation |
| `/issuing/output` | View the latest Issuing reconciliation result |
| `/acquiring/upload` | Upload Acquiring GL, FE, and EP files |
| `/acquiring/preview` | Preview Acquiring transactions and run reconciliation |
| `/acquiring/output` | View the latest Acquiring reconciliation result |

## Prerequisites

- Node.js 20 or newer
- npm or pnpm
- Access to the reconciliation backend API

## Getting Started

1. Clone the repository and enter the project directory.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root:

   ```env
   API_URL=http://localhost:5202
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Only `API_URL` is required. All endpoint paths have defaults and can be overridden when the backend uses different routes.

```env
# Backend origin—do not include a trailing slash
API_URL=http://localhost:5202

# Issuing upload endpoints
ISSUING_CBS_UPLOAD_PATH=/api/GL/uploadGLFiles
ISSUING_BO_UPLOAD_PATH=/api/BO/uploadBOFiles

# Issuing preview endpoints
ISSUING_CBS_PREVIEW_PATH=/api/GL/GetGLTransactionDetails
ISSUING_BO_PREVIEW_PATH=/api/BO/GetBOTransactionsList

# Reconciliation endpoints
ISSUING_RUN_MATCH_PATH=/api/Main/RunMatchAction
ISSUING_MATCHING_RESULTS_PATH=/api/Main/GetMatchingResults

# Optional Acquiring endpoint overrides
ACQUIRING_GL_UPLOAD_PATH=/api/Acquiring/uploadGLFiles
ACQUIRING_FE_UPLOAD_PATH=/api/Acquiring/uploadFEFiles
ACQUIRING_EP_UPLOAD_PATH=/api/Acquiring/uploadEPFiles
ACQUIRING_GL_PREVIEW_PATH=/api/Acquiring/GetGLTransactionDetails
ACQUIRING_FE_PREVIEW_PATH=/api/Acquiring/GetFETransactionDetails
ACQUIRING_EP_PREVIEW_PATH=/api/Acquiring/GetEPTransactionDetails
```

Acquiring GL, FE, and EP requests use the backend's Acquiring controller. Every path can be overridden when the backend action names differ.

Do not commit `.env.local`; environment files are intentionally excluded by `.gitignore`.

## API Flow

The browser calls same-origin Next.js API routes. These routes forward requests to the server configured by `API_URL`, which avoids exposing the backend origin to client-side code.

### Upload

```http
POST /api/issuing/upload?type=cbs
POST /api/issuing/upload?type=bo
POST /api/acquiring/upload?type=gl
POST /api/acquiring/upload?type=fe
POST /api/acquiring/upload?type=ep
```

Uploads use `multipart/form-data` and accept multiple files under the `files` field.

### Preview

```http
POST /api/issuing/preview?type=cbs
POST /api/issuing/preview?type=bo
POST /api/acquiring/preview?type=gl
POST /api/acquiring/preview?type=fe
POST /api/acquiring/preview?type=ep
```

Preview requests include server-side pagination, search, and sorting options.

### Run Reconciliation

```http
POST /api/Main/RunMatchAction
```

The Run request has no request body. A successful response is saved to session storage before navigation to the Output page.

### Matching Details

```http
POST /api/Main/GetMatchingResults
Content-Type: application/json
```

Example request:

```json
{
  "runId": 6,
  "reconciliationStatus": "MATCHED",
  "page": 1,
  "pageSize": 50
}
```

Supported reconciliation statuses:

| Display name | API value |
| --- | --- |
| Matched | `MATCHED` |
| Missing In CBS | `MISSING_IN_CBS` |
| Missing In BO | `MISSING_IN_BO` |
| Reverse Transaction | `REVERSE_TRANSACTION` |

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Turbopack development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Start the production server after building |
| `npx tsc --noEmit` | Run a standalone TypeScript check |

## Project Structure

```text
app/
├── acquiring/              # Acquiring Upload, Preview, and Output routes
├── api/                    # Same-origin backend proxy routes
├── issuing/                # Issuing Upload, Preview, and Output routes
├── dashboard/
├── login/
├── globals.css
└── layout.tsx

components/
├── preview/                # Preview table, columns, and pagination
├── providers/
├── ui/                     # Reusable UI primitives
├── app-sidebar.tsx
└── data-upload.tsx

lib/
├── api/                    # Typed browser API clients
├── reconciliation-run-storage.ts
└── utils.ts

types/                      # Shared TypeScript request/response types
```

The Acquiring pages reuse the Issuing screen implementations. Area-aware API clients and routes select the correct proxy path without duplicating the interface.

## Production

Build and run the optimized application:

```bash
npm run build
npm run start
```

Set `API_URL` and any endpoint overrides in the deployment environment before starting the application.

## Troubleshooting

### `API_URL is not configured`

Create `.env.local`, add the backend origin, and restart the development server.

```env
API_URL=http://localhost:5202
```

### Output says that run information is missing

Open the corresponding Preview page and complete a reconciliation run first. Output state is stored separately for Issuing and Acquiring in the current browser tab.

### Upload or preview requests fail

Confirm that:

- The backend is running and reachable from the Next.js server.
- `API_URL` contains the correct protocol, hostname, and port.
- The configured endpoint paths match the backend routes.
- Uploaded files are CSV, XLSX, or XLS files.

## Security Notes

- Backend URLs remain server-side through Next.js route handlers.
- Reconciliation details are requested using the API-returned run ID; IDs are never hardcoded.
- Run summary values are kept out of browser URLs.
- Secrets and environment-specific configuration should only be stored in ignored environment files or the deployment platform’s secret manager.
