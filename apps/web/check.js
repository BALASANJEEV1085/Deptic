const SUPABASE_URL = 'https://pifoeymzjwwungcbxyyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZm9leW16and3dW5nY2J4eXlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNzAxNiwiZXhwIjoyMDkzMzgzMDE2fQ.viZRYPy24oQjLGhSYQcJlxz9qloR7QlRHyp2GN7LO4E';

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fix_pull_requests`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  const text = await res.text();
  console.log(text);
}
main();
