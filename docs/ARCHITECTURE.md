# Architecture

`src/app` contains App Router screens and authenticated route handlers. `src/lib/supabase` owns cookie auth; `src/lib/storage` owns the Drive adapter contract and implementations; workflow authorization and atomicity live in `supabase/migrations`, close to the data and protected from client field tampering.

Request path: browser → Server Component/Action → Supabase with user cookie → RLS. Only offline import/bootstrap scripts use the service role. Evidence upload first retains a database record, then calls the adapter, and finally records `UPLOADED` or `FAILED`; retry reuses the stable upload key. Evidence download first performs an RLS-protected metadata lookup.

Important indexes cover company/status, dates, category, submission history, unread notifications, and audit timelines. The finding number counter uses a single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, avoiding client-side max-plus-one races.
