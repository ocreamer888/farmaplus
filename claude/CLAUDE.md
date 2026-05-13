# FarmaPlus — Claude Code notes

- Monorepo root: npm workspaces; app code in `apps/web`.
- Plans and specs: `docs/plans/`.
- Database and edge logic: `supabase/migrations`, `supabase/functions`.
- Batch / integration scripts: `services/etl`.

Read `PROJECT.md` and `README.md` before large changes.

---

## Brain (Persistent Memory)

The brain is a vector-search memory system with 18,000+ memories. Use it proactively at session start and save important decisions as you work.

### Session Start

Load context before starting work on any non-trivial task:

```
get_context_tool(topic="<task topic>", project="farmaplus", n=5)
```

For the latest decisions/state (recency matters):

```
1. get_stats_tool()                                         # metadata baseline
2. search_index(query="...", project="farmaplus", n=20)    # compact rows with timestamps
3. timeline_tool(anchor_id=<newest_id>, before=10)         # chronological context
4. get_observations_tool(ids="id1,id2")                    # full content only for IDs needed
```

**Do NOT use `search_brain` for recency** — it orders by semantic distance, not time.

### Saving Memories

Save after every significant decision, solution, or discovery:

```
save_memory_tool(
  content="...",
  memory_type="fact|solution|pattern|project_context|conversation",
  tags="...",
  project="farmaplus",
  title="Short title — YYYY-MM-DD"
)
```

| Type | When to use |
|------|-------------|
| `fact` | Verified data, metrics, timestamps, confirmed findings |
| `solution` | Bug fixes, implementations, completed code work |
| `pattern` | Recurring behaviors, best practices, team preferences |
| `project_context` | Roadmap decisions, constraints, stakeholder context |
| `conversation` | Chat context, clarifications, Q&A |

### Tool Selection

| Goal | Tool | Notes |
|------|------|-------|
| Latest memories | `stats → search_index → timeline` | Only way to get recency ordering |
| Semantically relevant (any age) | `search_brain` | Ordered by distance, not time |
| Topic context at start | `get_context_tool` | Top N by relevance |
| Full content for IDs | `get_observations_tool` | Fetch only IDs you need |
| Consolidate duplicates | `reflect_tool` | Auto every 20 saves; also trigger manually |
| Log user feedback | `record_feedback` | Call when user confirms or corrects a memory |

### Efficiency Rules

- `search_index` is fast and metadata-aware — use it for bulk filtering before fetching full content.
- `get_observations_tool` is cheap — never fetch all results, only the IDs you actually need.
- `search_brain` is expensive (full embedding) — reserve for semantic relevance queries.
- After every ~20 saves, run `reflect_tool()` to consolidate duplicates into patterns.
