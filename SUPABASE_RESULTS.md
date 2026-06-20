# Supabase pe Results Kaise Dekhen

## Mobile pe (Recommended)

1. **supabase.com** open karo phone browser mein
2. Login karo → apna project open karo
3. Left sidebar → **Table Editor** → `applications` table
4. Sare candidates yahan dikhenge

## Columns jo matter karte hain:

| Column | Kya hai |
|---|---|
| `name` | Candidate ka naam |
| `role` | Jis role pe apply kiya |
| `score` | 0–100 AI score |
| `grade` | A / B / C / D |
| `verdict` | **Hire** / **Maybe** / **Reject** |
| `summary` | 2-3 line AI summary |
| `strengths` | Strong points |
| `concerns` | Red flags |
| `recommended_next_step` | Kya karna chahiye |
| `transcript` | Poora Q&A conversation |
| `whatsapp` | Direct contact |

## Top candidates filter karna:

Supabase Table Editor mein:
1. `score` column pe click karo → Sort Descending
2. Ya filter lagao: `verdict = 'Hire'`

## Quick SQL views (SQL Editor mein run karo):

### Top candidates this week:
```sql
SELECT name, role, score, grade, verdict, summary, whatsapp
FROM applications
WHERE submitted_at > now() - interval '7 days'
ORDER BY score DESC;
```

### Hire-worthy only:
```sql
SELECT name, role, score, whatsapp, recommended_next_step
FROM applications
WHERE verdict = 'Hire'
ORDER BY score DESC;
```

### Role breakdown:
```sql
SELECT role, count(*) as total,
  round(avg(score)) as avg_score,
  count(*) FILTER (WHERE verdict='Hire') as hire_count
FROM applications
GROUP BY role;
```

## Full transcript kaise dekhen:

Table Editor mein kisi row pe click karo → `transcript` field expand hogi → poora conversation milega.

